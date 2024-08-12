import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { AuthGuard } from './auth.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Friendship, User } from '../entities/user.entity';

@Module({
  exports: [AuthService],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  imports: [
    TypeOrmModule.forFeature([User, Friendship]),
    forwardRef(() => UserModule),
  ],
})
export class AuthModule {}