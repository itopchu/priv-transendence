import { Controller, Get, Param, Req, Res, ParseIntPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { Request, Response } from 'express';
import { UserDTO } from 'src/dto/user.dto';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @Get(':id')
  async getUserById(@Res() res: Response, @Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.getUserById(id);
    if (!user)
      return res.status(404);
    res.status(200).json(user);
  }
}