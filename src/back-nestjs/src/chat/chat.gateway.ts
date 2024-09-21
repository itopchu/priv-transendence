import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, ConnectedSocket } from '@nestjs/websockets'; import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { ChannelService } from './channel/channel.service';
import { UserService } from '../user/user.service';
import { authenticateUser, UserSocket } from '../user/user.gateway';
import { NotFoundException, ParseIntPipe, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChannelPublicDTO, ChatClientDTO, MemberClientDTO, MessagePublicDTO } from '../dto/chat.dto';
import { MemberService } from './channel/member.service';
import { Chat } from '../entities/chat.entity';
import { ChatService } from './chat.service';
import { FriendshipAttitude } from '../entities/user.entity';

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

		Promise.all(expiredMutes.map(async (mute) => {
			try {
				await this.channelService.removeMute(mute.userId, mute.channelId);
				const membership = await this.memberService.getMembershipByChannel(mute.channelId, mute.userId, []);
				if (membership) {
					this.emitMemberUpdate(mute.channelId, UpdateType.updated);
				}
			} catch (error) {
				console.error(`Cron: Could not unmute user: ${error.message}`);
			}
		}))
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

		const membership = await this.memberService.getMembershipByChannel(channelId, user.id, []);
		if (!membership) {
			throw new UnauthorizedException('Unauthorized: Membership not found');
		}

		client.join(`channel#${channelId}`);
		client.join(`channelUpdate#${channelId}`);
		client.emit(`newChannelUpdate`, {
			channelId,
			content: new MemberClientDTO(membership),
			updateType: UpdateType.updated,
		})
		console.log(`${user.nameFirst} has subscribed to channel ${membership.channel.name}`);
	}

	@SubscribeMessage('subscribeChannel')
	async onSubscribeChannel(@MessageBody(ParseIntPipe) channelId: number, @ConnectedSocket() client: UserSocket) {
		const user = client.authUser;
		if (!user) {
			throw new UnauthorizedException('Unauthorized: User not found');
		}

		const membership = await this.memberService.getMembershipByChannel(channelId, user.id, ['channel']);
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
		const chat = await this.chatService.getChatById(payload.chatId, ['users']);
		if (!chat) {
			throw new NotFoundException('Chat not found');
		}

		const recipient = chat.users.find((chatUser) => chatUser.id !== user.id);
		if (!recipient) {
			throw new NotFoundException('Recipient not found');
		}

		const relationship = await this.userService.getUserFriendship(user, recipient);
		const isRestricted = !relationship ? false : relationship.user1.id === user.id
			? relationship.user1Attitude === FriendshipAttitude.restricted
			: relationship.user2Attitude === FriendshipAttitude.restricted
		if (isRestricted) {
			throw new UnauthorizedException('Unauthorized: User is blocked');
		}

		const message = await this.chatService.logMessage(chat.id, user, payload.content);
		const publicMessage = new MessagePublicDTO(message);
		const messageData = {
			chatId: chat.id,
			message: publicMessage,
		}
		const recipientSocket = this.connectedUsers.get(recipient?.id);
		if (recipientSocket) {
			recipientSocket.emit('directMessage', messageData);
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
			recipientSocket.emit('newChat', new ChatClientDTO(chat, recipient.id));
		}
	}

	emitMemberUpdate(channelId: number, updateType: UpdateType) {
		this.server.to(`channelUpdate#${channelId}`).emit(`newChannelUpdate`, { channelId, updateType });
	}

	emitPublicChannelUpdate(content: ChannelPublicDTO, updateType: UpdateType) {
		this.server.to('channelPublicUpdate').emit('newPublicChannelUpdate', { content, updateType });
	}
	
	emitToClientUpdate(userId: number, channelId: number, updateType: UpdateType) {
		const userSocket = this.connectedUsers.get(userId);
		if (!userSocket) return;

		userSocket.emit(`channelUpdate#${channelId}`, { channelId, updateType });
	}

	emitToClientPublicUpdate(userId: number, content: ChannelPublicDTO, updateType: UpdateType) {
		const userSocket = this.connectedUsers.get(userId);
		if (!userSocket) return;

		userSocket.emit('channelPublicUpdate', { content, updateType });
	}

	emitChannelDeleted(channelId: number) {
		this.emitMemberUpdate(channelId, UpdateType.deleted);
		this.server.socketsLeave(`channelUpdate#${channelId}`);
		this.server.socketsLeave(`channel#${channelId}`);
	}

	emitMemberJoined(channelId: number, userId: number) {
		const userSocket = this.connectedUsers.get(userId);

		if (userSocket) {
			userSocket.join(`channelUpdate#${channelId}`);
			userSocket.join(`channel#${channelId}`);
		}
		this.emitMemberUpdate(channelId, UpdateType.updated);
	}

	emitMemberLeft(userId: number, channelId: number) {
		const userSocket = this.connectedUsers.get(userId);

		if (userSocket) {
			userSocket.leave(`channelUpdate#${channelId}`);
			userSocket.leave(`channel#${channelId}`);
			userSocket.emit('newChannelUpdate', { channelId, UpdateType: UpdateType.deleted });
		}
		this.emitMemberUpdate(channelId, UpdateType.updated);
	}
}
