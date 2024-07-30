import { ConsoleLogger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { UserService } from '../user/user.service';
import { AccessTokenDTO } from '../dto/auth.dto';
import { UserDTO } from '../dto/user.dto';
import { User } from '../entities/user.entity';
import * as QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';

export interface ResponseData {
  message: string;
  redirectTo: string;
  user: UserDTO | null;
}

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) { }

  async getUserAccessToken(code: string): Promise<AccessTokenDTO | null> {
    if (!code) {
      console.error('No code');
      return (null);
    }
    try {
      const response = await fetch('https://api.intra.42.fr/oauth/token', {
        method: "POST",
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.configService.get<string>('SECRET_UID'),
          client_secret: this.configService.get<string>('SECRET_PWD'),
          code: code,
          redirect_uri: this.configService.get<string>('REDIRECT_URI'),
        })
      });
      if (!response.ok) {
        throw new Error('Problem with 42 temp key fetching.');
      }
      const token_info: AccessTokenDTO = await response.json();
      return token_info;
    } catch (error) {
      console.error('Error fetching user access token:', error);
    }
    return (null);
  }

  async getUserMe(access_token: string): Promise<Record<string, any> | null> {
    if (!access_token) {
      console.error('No access token');
      return (null);
    }
    try {
      const response = await fetch('https://api.intra.42.fr/v2/me', {
        method: "GET",
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    return null;
  }

  async login(code: string, res: Response) {
    const { access, userMe, userId } = (await this.validateTempCode(code)) ?? {};
    if (!access || !userMe || !userId)
      return res.status(401).clearCookie('auth_token').redirect(`${process.env.ORIGIN_URL_FRONT}/`);
    const user = await this.userService.getUserByIntraId(userId);
    if (!user) {
      try {
        await this.userService.createUser(access, userMe);
        this.addAuthToCookie(res, userId);
        return res.redirect(`${process.env.ORIGIN_URL_FRONT}/profile/settings`);
      } catch (error) {
        console.error('Error creating user:', error);
        res.status(401).clearCookie('auth_token').redirect(`${process.env.ORIGIN_URL_FRONT}/`);
        return ;
      }
    }

    if (user.auth2F) {
      const payload: JwtPayload = { intraId: userId };
      const signedToken = sign(payload, this.configService.get<string>('SECRET_KEY'));
      res.cookie('2fa_token', signedToken, { httpOnly: true, maxAge: 10 * 365 * 24 * 60 * 60 * 1000 });
      return res.status(200).redirect(`${process.env.ORIGIN_URL_FRONT}/2fa`)
    }

    this.addAuthToCookie(res, userId);
    res.redirect(`${process.env.ORIGIN_URL_FRONT}/`);
  }

  async validateTempCode(code: string): Promise<{ access: AccessTokenDTO, userMe: Record<string, any>, userId: number } | null> {
    if (!code)
      return null;
    const access = await this.getUserAccessToken(code);
    if (access === null)
      return null;
    const userMe = await this.getUserMe(access.access_token);
    if (userMe === null)
      return null;
    const userId: number = Number(userMe.id);
    if (isNaN(userId))
      return null;
    return { access, userMe, userId };
  }

  addAuthToCookie(res: Response, intraId: number) {
    const payload: JwtPayload = { intraId: intraId };
    const signedToken = sign(payload, this.configService.get<string>('SECRET_KEY'));
    res.cookie('auth_token', signedToken, { httpOnly: true, maxAge: 10 * 365 * 24 * 60 * 60 * 1000 });
  }

  generate2FASecret(): speakeasy.GeneratedSecret {
    const secretCode = speakeasy.generateSecret({ name: process.env.PROJECT_NAME });
    return secretCode;
  }

  respondWithQRCode(otpauth_url: string, res: Response) {
    QRCode.toFileStream(res, otpauth_url);
  }

  async getQRCode(user: User, res: Response) {
    const secretCode = this.generate2FASecret();
    const secretKey = this.configService.get<string>('SECRET_KEY');

    const payload = {
      signedBase: secretCode.base32,
      intraId: user.intraId
    };

    const secretQR = sign(payload, secretKey);
    res.cookie('secretQR', secretQR, { httpOnly: true });
    try {
      this.respondWithQRCode(secretCode.otpauth_url, res);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  async verifyQRCode(user: User, req: Request, res: Response) {
    const secretQR = req.cookies['secretQR']
    if (!secretQR)
      return res.status(404);

    let decodedSecret;
    try {
      decodedSecret = verify(secretQR, this.configService.get<string>('SECRET_KEY'));
    } catch (err) {
      return res.status(401).clearCookie('secretQR');
    }

    if (typeof decodedSecret !== 'object' || decodedSecret.intraId !== user.intraId)
      return res.status(409).clearCookie('secretQR');

    const { verificationCode } = req.body;

    if (!verificationCode)
      return res.status(404).clearCookie('secretQR');

    if (!this.validate2FACode(decodedSecret.signedBase, verificationCode))
      return res.status(418).clearCookie('secretQR');

    user.auth2F = decodedSecret.signedBase;
    const newUser = await this.userService.updateUser(res, user);
    if (!newUser)
      return res.clearCookie('secretQR');
    const userDTO = new UserDTO(newUser);
    res.clearCookie('secretQR').json({ userDTO });
  }

  async deleteQRCode(user: User, res: Response) {
    user.auth2F = null;
    const newUser = await this.userService.updateUser(res, user);
    if (newUser)
      return res.json({ userDTO: new UserDTO(newUser) })
  }

  validate2FACode(secretKey: string, inputToken: string): boolean {
    return speakeasy.totp.verify({ secret: secretKey, encoding: 'base32', token: inputToken });
  }

  async verify2FACode(req: Request, res: Response) {
    const token_2FA = req.cookies['2fa_token'];
    if (!token_2FA)
      return res.status(404).redirect(`${process.env.ORIGIN_URL_FRONT}/`);

    const { TOTPcode } = req.body;
    if (!TOTPcode || typeof TOTPcode !== 'string' || TOTPcode.length !== 6) {
      return res.status(400);
    }

    let decodedSecret;
    try {
      decodedSecret = verify(token_2FA, this.configService.get<string>('SECRET_KEY'));
    } catch (err) {
      return res.status(401);
    }

    const user = await this.userService.getUserByIntraId(decodedSecret.intraId);
    if (!user)
      return res.status(404).clearCookie('2fa_token').redirect(`${process.env.ORIGIN_URL_FRONT}/`);

    if (!this.validate2FACode(user.auth2F, TOTPcode))
      return res.status(418);
    this.addAuthToCookie(res, user.intraId);
    res.clearCookie('2fa_token').status(200).json({ userDTO: new UserDTO(user) })
  }
}
