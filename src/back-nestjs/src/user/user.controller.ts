import { UseGuards, Controller, Get, Param, Req, Res, ParseIntPipe, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { Request, Response, Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { UserClient, UserPublicDTO } from '../dto/user.dto';
import { AuthGuard } from '../auth/auth.guard';
import { UserGateway } from './user.gateway';
import * as fs from 'fs';
import * as path from 'path';
import { FriendshipAttitude, FriendshipAttitudeBehaviour, User } from '../entities/user.entity'
import { on } from 'events';

export const multerOptions = {
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
  
  @Get('search/:search')
  @UseGuards(AuthGuard)
  async searchUsers(@Res() res: Response, @Param('search') search: string) {
    const users = await this.userService.searchUsers(search);
    if (!users)
      return res.status(404);
    const usersDTO = users.map(user => new UserPublicDTO(user, null));
    return res.status(200).json(usersDTO);
  }

  @Get('friendship/restricted')
  @UseGuards(AuthGuard)
  async getUserRestrictedFriendships(@Res() res: Response, @Req() req: Request) {
    const user = req.authUser;
    const friendships = await this.userService.getUserFriendshipRestricted(user.id);
		const restrictedUsers = (friendships ?? []).map((friendship) => (
			friendship.user1.id === user.id
			? new UserPublicDTO(friendship.user2, null)
			: new UserPublicDTO(friendship.user1, null)
		))
		return res.status(200).json({ blockedUsers: restrictedUsers});
  }

  @Get('friendship/:id')
  @UseGuards(AuthGuard)
  async getUserFriendshipAttitude(@Res() res: Response, @Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const user = req.authUser;
    const user2 = await this.userService.getUserById(id);
    if (!user2)
      return res.status(404);
    const friendship = await this.userService.getUserFriendship(user, user2);
    if (!friendship)
      return res.status(404);
    const friendshipAttitude = friendship.user1.id === user.id ? friendship.user1Attitude : friendship.user2Attitude;
    return res.status(200).json({friendshipAttitude});
  }

  @Post('friendship/:id')
  @UseGuards(AuthGuard)
  async postUserFriendShip(@Res() res: Response, @Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const { type } = req.body;
    if (!Object.values(FriendshipAttitudeBehaviour).includes(type)) {
      console.log('Invalid Type');
      throw new BadRequestException('Invalid Type');
    }
    const user = req.authUser;
    if (user.id === id) {
      console.log('user.id === id');
      throw new BadRequestException('Invalid Id');
    }
    const user2 = await this.userService.getUserById(id);
    if (!user2){
      console.log('user2 not found');      
      return res.status(404);
    }
    const friendshipAttitude = await this.userService.postUserFriendShip(user, user2, type);
    if (!friendshipAttitude) {
      console.log('friendshipAttitude not found');
      return res.status(406);
    }
    return res.status(200).json({friendshipAttitude});
  }
  
  @Get('friends/:id')
  async getUserFriendsById(@Res() res: Response, @Param('id', ParseIntPipe) id: number) {
    const friends = await this.userService.getUserFriendsById(id);
    if (!friends)
      return res.status(404);
    const friendsDTO = friends.map(friend => new UserPublicDTO(friend, null));
    return res.status(200).json({friendsDTO})
  }
  
  @Get('games/:id')
  async getUserGamesById(@Res() res: Response, @Param('id', ParseIntPipe) id: number) {
    console.log('getUserGamesById:', id);
    const games = await this.userService.getUserGamesById(id);
    if (!games) {
      return res.status(404);
    }
    const gamesDTO = games.map(game => ({
      ...game,
      player1: new UserPublicDTO(game.player1, null),
      player2: new UserPublicDTO(game.player2, null)
    }));

    return res.status(200).json({gamesDTO});
  }

  @Get('getUsers/online')
  @UseGuards(AuthGuard)
  async getOnlineUsers(@Req() req: Request, @Res() res: Response) {
    const userId = req.authUser.id;

    const onlineUsers = Array.from(this.userGateway.connectedUsers.entries())
      .filter(([key, value]) => value > 0 && key !== userId)
      .map(([key, value]) => key);
  
    const publicUsers: UserPublicDTO[] = await Promise.all(onlineUsers.map(async (id) => {
      const user = await this.userService.getUserById(id);
      return new UserPublicDTO(user, null);
    }));
  
    return res.status(200).json({ publicUsers });
  }
}
