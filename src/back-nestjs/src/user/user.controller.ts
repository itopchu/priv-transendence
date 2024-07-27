import { UseGuards, Controller, Get, Param, Req, Res, ParseIntPipe, Post } from '@nestjs/common';
import { Request, Response } from 'express';
import { UserService } from './user.service';
import { UserDTO } from '../dto/user.dto';
import { AuthService } from '../auth/auth.service';
import { AuthGuard } from '../auth/auth.guard';


@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) { }

  @Get(':id')
  async getUserById(@Res() res: Response, @Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.getUserById(id);
    if (!user)
      return res.status(404);
    res.status(200).json(new UserDTO(user));
  }

  @Post('update')
  @UseGuards(AuthGuard)
  async updateUser(@Req() req: Request, @Res() res: Response) {
    const { nickname, email, greeting } = req.body;
    const user = req.authUser;
    user.nameNick = nickname;
    user.email = email;
    user.greeting = greeting;
    if (await this.userService.updateUser(res, user))
      return res.json(new UserDTO(user));
  }
}