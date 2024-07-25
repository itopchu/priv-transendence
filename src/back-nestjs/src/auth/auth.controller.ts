import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService, ResponseData } from './auth.service';

@Controller('auth')
export class AuthController {

  constructor(
    private readonly authService: AuthService,
  ) { }

  @Get('login')
  async login(@Query('code') code: string, @Res() res: Response) {
    return await this.authService.login(code, res);
  }

  @Get('validate')
  async validate(@Req() req: Request, @Res() res: Response) {
    return await this.authService.validate(req, res);
  }

  @Get('logout')
  async logout(@Res() res: Response) {
    this.authService.handleRedir(res, true, '/login', 'Logged out successfully');
  }

  // @Get('qr')
  // async getQR(@Req() req: Request, @Res() res: Response) {
  //   const rpData : ResponseData = {
  //     message: '',
  //     redirectTo: '',
  //     user: null,
  //   };
  //   const user = await this.authService.validateAuth(rpData, req, res);
  //   if (!user)
  //     return ;
  //   res.json({qrUrl: await this.authService.generateQR(res, user)});
  // }
}