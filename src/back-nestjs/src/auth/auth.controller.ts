import { Controller, Delete, UseGuards, Get, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { UserDTO } from '../dto/user.dto';

@Controller('auth')
export class AuthController {

  constructor(
    private readonly authService: AuthService,
  ) { }

  @Get('login')
  async login(@Query('code') code: string, @Res() res: Response) {
    await this.authService.login(code, res)
  }

  @Get('validate')
  @UseGuards(AuthGuard)
  async validate(@Req() req: Request, @Res() res: Response) {
    const userDTO = new UserDTO(req.authUser);
    return res.json({ userDTO });
  }

  @Get('logout')
  async logout(@Res() res: Response) {
    try {
      res.clearCookie('auth_token');
      res.status(200).send({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).send({ message: 'Error logging out' });
    }
  }

  @Get('QRCode')
  @UseGuards(AuthGuard)
  async getQRCode(@Req() req: Request, @Res() res: Response) {
    await this.authService.getQRCode(req.authUser, res);
  }

  @Post('QRCode')
  @UseGuards(AuthGuard)
  async verifyQRCode(@Req() req: Request, @Res() res: Response) {
    await this.authService.verifyQRCode(req.authUser, req, res);
  }

  @Delete('QRCode')
  @UseGuards(AuthGuard)
  async deleteQRCode(@Req() req: Request, @Res() res: Response) {
    await this.authService.deleteQRCode(req.authUser, res);
  }

  // Not done yet
  @Post('2FACode')
  @UseGuards(AuthGuard)
  async verify2FACode(@Req() req: Request, @Res() res: Response) {
    if (!req.authUser.auth2F)
      return res.status(200);
    const token = req.body as string;
  }
}