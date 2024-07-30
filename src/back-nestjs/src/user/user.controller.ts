import { UseGuards, Controller, Get, Param, Req, Res, ParseIntPipe, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Request, Response, Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { UserDTO } from '../dto/user.dto';
import { AuthGuard } from '../auth/auth.guard';
import * as multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';

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
    const newUser = await this.userService.updateUser(res, user);
    if (newUser)
      return res.json(new UserDTO(newUser));
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
      const userDTO = new UserDTO(newUser);
      return res.json({ userDTO });
    } catch (error) {
      fs.unlinkSync(uploadPath);
      return res.status(500).json({ message: 'Failed to update user', error: error.message });
    }
  }
}