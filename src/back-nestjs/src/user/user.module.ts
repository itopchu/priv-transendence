import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserGateway } from './user.gateway';
import { User, Friendship } from '../entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { WSAuthGuard } from '../auth/auth.ws.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Friendship]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UserController],
  providers: [UserService, UserGateway, WSAuthGuard],
  exports: [UserService, TypeOrmModule, UserGateway],
})
export class UserModule {}