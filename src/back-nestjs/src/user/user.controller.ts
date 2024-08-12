import { UseGuards, Controller, Get, Param, Req, Res, ParseIntPipe, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { Request, Response, Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { UserClient, UserPublicDTO } from '../dto/user.dto';
import { AuthGuard } from '../auth/auth.guard';
import { UserGateway } from './user.gateway';
import * as fs from 'fs';
import * as path from 'path';
import { FriendshipStatusBehaviour } from '../entities/user.entity'

const multerOptions = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
};

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userGateway: UserGateway,
  ) { }

  @Get(':id')
  async getUserById(@Res() res: Response, @Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.getUserById(id);
    if (!user)
      return res.status(404);
    res.status(200).json(new UserClient(user));
  }
  
  @Post('update')
  @UseGuards(AuthGuard)
  async updateUser(@Req() req: Request, @Res() res: Response) {
    const { nickname, email, greeting } = req.body;
    const user = req.authUser;

    if (typeof nickname !== 'string' || typeof email !== 'string' || typeof greeting !== 'string') {
      return res.status(400).json({ message: 'Invalid input' });
    }

    user.nameNick = nickname;
    user.email = email;
    user.greeting = greeting;
    const newUser = await this.userService.updateUser(res, user);
    if (newUser) {
      this.userGateway.emitStatus(newUser);
      return res.json(new UserClient(newUser));
    }
  }

  @Post('upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('image', multerOptions))
  async uploadImage(@UploadedFile() file: Express.Multer.File, @Req() req: Request, @Res() res: Response) {
    if (!file) {
      return res.status(400).json({ message: 'Invalid file type or size' });
    }
    const user = req.authUser;
    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${timestamp}_${user.nameFirst}_${user.nameLast}${fileExtension}`;
    const uploadPath = path.join('/app/uploads', fileName);

    try {
      fs.writeFileSync(uploadPath, file.buffer);
    } catch (error) {
      return res.status(500).json({ message: 'Failed to upload file', error: error.message });
    }

    const oldImage = user.image;
    user.image = fileName;
    try {
      const newUser = await this.userService.updateUser(res, user);
      if (!newUser) {
        user.image = oldImage;
        fs.unlinkSync(uploadPath);
        return res.status(500).json({ message: 'Failed to update user' });
      }
      try {
        fs.unlinkSync('/app/uploads/' + oldImage);
      } catch (error) {
      }
      this.userGateway.emitStatus(newUser);
      const userClient = new UserClient(newUser);
      return res.json({ userClient });
    } catch (error) {
      fs.unlinkSync(uploadPath);
      return res.status(500).json({ message: 'Failed to update user', error: error.message });
    }
  }
  
  // @Get('friendship/:id')
  // @UseGuards(AuthGuard)
  // async getUserFriendShip(@Res() res: Response, @Req() req: Request, @Param('id', ParseIntPipe) id: number) {
  //   const user = req.authUser;
  //   const friendship = await this.userService.getUserFriendShip(user, id);
  //   res.status(200).json(friendship);
  // }

  // @Post('friendship/:id')
  // @UseGuards(AuthGuard)
  // async postUserFriendShip(@Res() res: Response, @Req() req: Request, @Param('id', ParseIntPipe) id: number) {
  //   const { type } = req.body;
  //   const user = req.authUser;
  //   if (!Object.values(FriendshipStatusBehaviour).includes(type))
  //     throw new BadRequestException('Invalid Type');
  //   if (user.id === id)
  //     throw new BadRequestException('Invalid Id');
  //   const friendship = await this.userService.postUserFriendShip(user, id, type);
  //   if (!friendship)
  //     return res.status(406);
  // }

  // @Get('friends/:id')
  // async getUserFriendsById(@Res() res: Response, @Param('id', ParseIntPipe) id: number) {
  //   const friends = await this.userService.getUserFriendsById(id);
  //   if (!friends)
  //     return res.status(404);
  //   const friendsDTO = friends.map(friend => new UserPublicDTO(friend, null));
  //   res.status(200).json(friendsDTO)
  // }

}