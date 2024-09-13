import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserGateway } from './user.gateway';
import { User, Friendship } from '../entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { WSAuthGuard } from '../auth/auth.ws.guard';
import { GameService } from './user.game.service';
import { GameHistory } from '../entities/game.history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Friendship, GameHistory]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UserController],
  providers: [UserService, UserGateway, WSAuthGuard, GameService],
  exports: [UserService, TypeOrmModule, UserGateway, GameService],
})
export class UserModule {}