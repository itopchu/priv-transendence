import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth/auth.controller';
import { UserController } from './user/user.controller';
import { AuthModule } from './auth/auth.module';
import { User, Friendship } from './entities/user.entity';
import { UserModule } from './user/user.module';
import { ChatModule } from './chat/chat.module';
import { GameModule } from './game/game.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { Channel, ChannelMember, Message, Mute, Chat } from './entities/channel.entity';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  controllers: [AuthController, UserController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
	ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST'),
        port: configService.get('PORT_POSTGRES'),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DB'),
        entities: [User, Friendship, Channel, Chat, ChannelMember, Message, Mute],
        synchronize: true,
      })
    }),
    ChatModule,
    GameModule,
  ],
})

export default class EntryModule { }
