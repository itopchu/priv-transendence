import { Controller, Get, Param, Req, Res, ParseIntPipe, Post } from '@nestjs/common';
import { Request, Response } from 'express';
import { UserService } from './user.service';
import { UserDTO } from '../dto/user.dto';
import { ResponseData, AuthService } from '../auth/auth.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Get(':id')
  async getUserById(@Res() res: Response, @Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.getUserById(id);
    if (!user)
      return res.status(404);
    res.status(200).json(new UserDTO(user));
  }

  @Post('update')
  async updateUser(@Req() req: Request, @Res() res: Response) {
    const responseData : ResponseData = {
      message: '',
      redirectTo: '',
      user: null,
    };

    const user = await this.authService.validateAuth(responseData, req, res);
    if (!user)
        return ;
    const { nickname, email, greeting } = req.body;
    user.nameNick = nickname;
    user.email = email;
    user.greeting = greeting;
    await this.userService.updateUser(res, user);
  }
}