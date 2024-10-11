import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelService } from './channel/channel.service';
import { ChannelController } from './channel/channel.controller';
import { ChatGateway } from './chat.gateway';
import { Channel, ChannelMember, Message, Mute, Chat, Invite } from '../entities/chat.entity';
import { UserModule } from '../user/user.module';
import { MessageService } from './message/message.service';
import { MemberService } from './channel/member.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { MessageController } from './message/message.controller';
import { InviteService } from './invite/invite.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Channel, ChannelMember, Message, Mute, Chat, Invite]),
		UserModule,
	],
	providers: [ChannelService, MessageService, InviteService, MemberService, ChatService, ChatGateway],
	controllers: [ChannelController, ChatController, MessageController],
	exports: [ChannelService, MemberService, MemberService, ChatService],
})
export class ChatModule {}
