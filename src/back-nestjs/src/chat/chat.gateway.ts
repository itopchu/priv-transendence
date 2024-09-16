import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, ConnectedSocket } from '@nestjs/websockets'; import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { ChannelService } from './channel/channel.service';
import { UserService } from '../user/user.service';
import { authenticateUser, UserSocket } from '../user/user.gateway';
import { NotFoundException, ParseIntPipe, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChannelPublicDTO, ChatClientDTO, MessagePublicDTO } from '../dto/channel.dto';
import { MemberService } from './channel/member.service';
import { Chat } from 'src/entities/channel.entity';
import { ChatService } from './chat.service';

export enum UpdateType {
	deleted = 'deleted',
	updated = 'updated',
}

@WebSocketGateway(3001, { cors: { origin: "*" } })
export class ChatGateway {
	constructor(private readonly userService: UserService,
				private readonly configService: ConfigService,
				private readonly channelService: ChannelService,
				private readonly memberService: MemberService,
				private readonly chatService: ChatService,
			   ) { }

	@WebSocketServer()
	server: Server;

  private connectedUsers: Map<number, UserSocket> = new Map();
	
	@Cron(CronExpression.EVERY_MINUTE)
	async checkMutes() {
		const expiredMutes = await this.channelService.getExpiredMutes();

		console.log(expiredMutes);
		for (const mute of expiredMutes ?? []) {
			try {
				await this.channelService.removeMute(mute.userId, mute.channelId);
				this.emitChannelUpdate(mute.channelId);
			} catch (error) {
				console.error(`Cron: Could not unmute user: ${error.message}`);
			}
		}
	}

	async handleConnection(client: Socket) {
		try {
			const user = await authenticateUser(client, this.configService, this.userService);
			this.connectedUsers.set(user.id, client);
		} catch (error) {
			client.disconnect(true);
			console.error(error.message);
			return (false);
		}
		return (true);
	}

	handleDisconnect(client: UserSocket) {
		const user = client.authUser;

		if (user) {
			this.connectedUsers.delete(user.id);
			const rooms = Array.from(client.rooms);
			rooms.forEach(room => {
				client.leave(room);
			});
		}
		console.log('Client disconnected from channels:', user?.nameFirst, client.id);
	}

	@SubscribeMessage('subscribePublicChannel')
	async onPublicUpdate(@ConnectedSocket() client: UserSocket) {
		const user = client.authUser;
		if (!user) {
			throw new UnauthorizedException('Unauthorized: User not found');
		}
		
		client.join('channelPublicUpdate');
	}

	@SubscribeMessage('joinChannel')
	async onJoinChannel(@MessageBody(ParseIntPipe) channelId: number, @ConnectedSocket() client: UserSocket) {
		const user = client.authUser;
		if (!user) {
			throw new UnauthorizedException('Unauthorized: User not found');
		}

		const membership = await this.memberService.getMembershipByChannel(channelId, user.id);
		if (!membership) {
			throw new UnauthorizedException('Unauthorized: Membership not found');
		}

		client.join(`channel#${channelId}`);
		client.join(`channelUpdate#${channelId}`);
		client.emit(`newChannelUpdate`, channelId);
		console.log(`${user.nameFirst} has subscribed to channel ${membership.channel.name}`);
	}

	@SubscribeMessage('subscribeChannel')
	async onSubscribeChannel(@MessageBody(ParseIntPipe) channelId: number, @ConnectedSocket() client: UserSocket) {
		const user = client.authUser;
		if (!user) {
			throw new UnauthorizedException('Unauthorized: User not found');
		}

		const membership = await this.memberService.getMembershipByChannel(channelId, user.id);
		if (!membership) {
			throw new UnauthorizedException('Unauthorized: Membership not found');
		}

		client.join(`channel#${channelId}`);
		client.join(`channelUpdate#${channelId}`);
		console.log(`${user.nameFirst} has subscribed to channel ${membership.channel.name}`);
	}

	@SubscribeMessage('unsubscribeChannel')
	onUnsubscribe(@ConnectedSocket() client: UserSocket, @MessageBody(ParseIntPipe) channelId: number) {
		const user = client.authUser;
		if (!user) {
			throw new UnauthorizedException('Unauthorized: User not found');
		}
		
		if (channelId === -1) {
			const rooms = Array.from(client.rooms);
			const roomInitial = 'channel';

			rooms.forEach(room => {
				if (room.slice(0, roomInitial.length) === roomInitial) {
					client.leave(room);
				}
			});
		} else {
			client.leave(`channelUpdate#${channelId}`);
			client.leave(`channel#${channelId}`);
		}
	}

	@SubscribeMessage('message')
	async onMessage(@MessageBody() data: { message: string, channelId: number }, @ConnectedSocket() client: UserSocket) {
		const user = client.authUser;
		if (!user) {
			throw new UnauthorizedException('Unauthorized: User not found');
		}

		try {
			const message = await this.channelService.logMessage(data.channelId, user, data.message);
			this.server.to(`channel#${data.channelId}`).emit(`channel#${data.channelId}Message`, new MessagePublicDTO(message));
		} catch (error) {
			client.emit('messageError', error.message);
		}
	}

  @SubscribeMessage('sendDirectMessage')
  async directMessage(client: UserSocket, payload: { chatId: number, content: string }) {
    const user = client.authUser;
    if (!user) {
      throw new UnauthorizedException('Unauthorized: User not found');
    }

	try {
		const chat = await this.chatService.getChatById(payload.chatId, ['users', 'users.blockedUsers']);
		if (!chat) {
			throw new NotFoundException('Chat not found');
		}

		const recipient = chat.users.find((chatUser) => chatUser.id !== user.id);
		if (!recipient) {
			//throw new NotFoundException('Recipient not found');
		}

		const isBlocked = recipient?.blockedUsers?.some((blockedUser) => blockedUser.id === user.id);
		if (isBlocked) {
			throw new UnauthorizedException('Unauthorized: User is blocked');
		}

		const message = await this.chatService.logMessage(chat.id, user, payload.content);
		const publicMessage = new MessagePublicDTO(message);
		const messageData = {
			chatId: chat.id,
			message: publicMessage,
		}
		const recipientSocket = false; //this.connectedUsers.get(recipient.id);
		if (recipientSocket) {
			//recipientSocket.emit('directMessage');
		}
		client.emit('directMessage', messageData);
		//client.emit('messageSent', message.timestamp);
	} catch(error) {
		console.log(error);
		client.emit('directMessageError', error.message);
	}
  }

	emitNewChat(chat: Chat) {
		const recipient = chat.users[1];
		const recipientSocket = this.connectedUsers.get(recipient.id);

		if (recipientSocket) {
			recipientSocket .emit('newChat', new ChatClientDTO(chat, recipient.id));
		}
	}

	emitChannelUpdate(channelId: number) {
		this.server.to(`channelUpdate#${channelId}`).emit(`newChannelUpdate`, channelId);
	}

	emitPublicChannelUpdate(channel: ChannelPublicDTO, updateType: UpdateType) {
		this.server.to('channelPublicUpdate').emit('newPublicChannelUpdate', {channel: channel, updateType: updateType });
	}

	emitChannelDeleted(channelId: number) {
		this.emitChannelUpdate(channelId);
		this.server.socketsLeave(`channelUpdate#${channelId}`);
		this.server.socketsLeave(`channel#${channelId}`);
	}

	emitMemberLeft(userId: number, channelId: number) {
		const userSocket = this.connectedUsers.get(userId);

		this.emitChannelUpdate(channelId);
		if (userSocket) {
			userSocket.leave(`channelUpdate#${channelId}`);
			userSocket.leave(`channel#${channelId}`);
		}
	}
}
