import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { verify, JwtPayload } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';

declare module 'express' {
  interface Request {
    authUser?: User;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    await this.validateAuth(request, response);
    return true;
  }

  async validateAuth(req: any, res: any) {

    // Check for 2FA token
    const twoFAToken = req.cookies['2fa_token'];
    if (twoFAToken) {
      const user = { id: 0, auth2F: true };
      res.status(200).json(user);
      return;
    }

    // Extract token
    const token = req.cookies['auth_token'];
    if (!token)
      this.handleUnauthorized(res);
    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = verify(token, this.configService.get<string>('SECRET_KEY')) as JwtPayload;
    } catch (error) {
      this.handleUnauthorized(res);
    }

    // Check decoded type and intraId
    if (typeof decoded !== 'object' || !decoded.intraId || isNaN(Number(decoded.intraId)))
      this.handleUnauthorized(res);

    // Find user
    const user = await this.userService.getUserByIntraId(Number(decoded.intraId));
    if (!user)
      this.handleUnauthorized(res);
    req.authUser = user as User;
  }

  handleUnauthorized(res: any): void {
    res.clearCookie('auth_token');
    res.redirect(`${process.env.ORIGIN_URL_FRONT}/`);
    res.status(401);
    throw new UnauthorizedException();
  }
}