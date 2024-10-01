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

export enum RoomInitials {
	channelMessage = 'channel#',
	channelUpdate = 'channelUpdate#',
	publicUpdate = 'channelPublicUpdate',
}

type emitUpdateDTO<Type> = {
	id: number,
	content?: Type,
	updateType: UpdateType,
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
				if (room.slice(0, RoomInitials.channelUpdate.length) === RoomInitials.channelUpdate) {
					this.emitOnlineMembers(room);
				}
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
		
		client.join(RoomInitials.publicUpdate);
	}

	@SubscribeMessage('unsubscribePublicChannel')
	async onUnsubscribePublicUpdate(@ConnectedSocket() client: UserSocket) {
		const user = client.authUser;
		if (!user) {
			throw new UnauthorizedException('Unauthorized: User not found');
		}
		
		client.leave(RoomInitials.publicUpdate);
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

		this.handleChannelJoinLeave(channelId, client, 'join');
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

		this.handleChannelJoinLeave(channelId, client, 'join');
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
			console.log('leave all');

			rooms.forEach(room => {
				if (room.slice(0, RoomInitials.channelUpdate.length) === RoomInitials.channelUpdate) {
					client.leave(room);
					this.emitOnlineMembers(room);
				} else if (room.slice(0, RoomInitials.channelMessage.length) === RoomInitials.channelMessage) {
					client.leave(room);
				}
			});
		} else {
			this.handleChannelJoinLeave(channelId, client, 'leave');
		}
	}

	@SubscribeMessage('message')
	async onMessage(@MessageBody() data: { message: string, channelId: number }, @ConnectedSocket() client: UserSocket) {
		try {
			const user = client.authUser;
			if (!user) {
				throw new UnauthorizedException('Unauthorized: User not found');
			}

			const message = await this.channelService.logMessage(data.channelId, user, data.message);
			this.emitChannelMessageUpdate(data.channelId, new MessagePublicDTO(message), UpdateType.updated);
		} catch (error) {
			client.emit('messageError', error.message);
		}
	}

  @SubscribeMessage('sendChatMessage')
  async onChatMessage(client: UserSocket, payload: { chatId: number, content: string }) {
	try {
		const user = client.authUser;
		if (!user) {
		  throw new UnauthorizedException('Unauthorized: User not found');
		}

		const chat = await this.chatService.getChatById(payload.chatId, ['users']);
		if (!chat) {
			throw new NotFoundException('Chat not found');
		}

		const recipient = chat.users.find((chatUser) => chatUser.id !== user.id);
		if (!recipient) {
			throw new NotFoundException('Recipient not found');
		}

		const relationship = await this.userService.getUserFriendship(user, recipient);
		if (relationship) {
			if (relationship.user1Attitude === FriendshipAttitude.restricted) {
				throw new UnauthorizedException(`Unauthorized: ${relationship.user1.nameFirst} is blocked`);
			}
			if (relationship.user2Attitude === FriendshipAttitude.restricted) {
				throw new UnauthorizedException(`Unauthorized: ${relationship.user2.nameFirst} is blocked`);
			}
		}

		const message = await this.chatService.logMessage(chat.id, user, payload.content);
		const publicMessage = new MessagePublicDTO(message);
		this.emitChatMessageUpdate(chat, publicMessage, UpdateType.updated);
	} catch(error) {
		client.emit('chatMessageError', error.message);
	}
  }
	
	handleChannelJoinLeave(channelId: number, client: UserSocket, action: 'join' | 'leave') {
		const room = `${RoomInitials.channelUpdate}${channelId}`; 

		if (action === 'join') {
			client.join(room);
			client.join(`${RoomInitials.channelMessage}${channelId}`);
		} else {
			client.leave(room);
			client.leave(`${RoomInitials.channelMessage}${channelId}`);
		}
		this.emitOnlineMembers(room, channelId);
	}

	emitOnlineMembers(room: string, channelId?: number) {
		const onlineMembersCount = this.server.sockets.adapter.rooms.get(room)?.size || 0

		if (!channelId) {
			channelId = Number(room.slice(RoomInitials.channelUpdate.length));
		}

		this.server.to(room).emit('onlineMembersCount', {
			id: channelId,
			content: onlineMembersCount,
			updateType: UpdateType.updated
		});
	}

	emitNewChat(chat: Chat) {
		const recipient = chat.users[1];
		const recipientSocket = this.connectedUsers.get(recipient.id);

		if (recipientSocket) {
			recipientSocket.emit('newChat', new ChatClientDTO(chat, recipient.id));
		}
	}

	emitChannelMessageUpdate(channelId: number, content: MessagePublicDTO, updateType: UpdateType) {
		this.server.to(`${RoomInitials.channelMessage}${channelId}`)
			.emit(`newChannel${channelId}MessageUpdate`, { id: channelId, content, updateType });
	}

	async emitChatMessageUpdate(
		chat: Chat,
		content: MessagePublicDTO,
		updateType: UpdateType,
	) {
		if (!chat.users) {
			chat = await this.chatService.getChatById(chat.id, ['users']);
		}
		const user1Socket = this.connectedUsers.get(chat.users[0].id);
		const user2Socket = this.connectedUsers.get(chat.users[1].id);
		
		if (user1Socket) {
			user1Socket.emit('newChatMessageUpdate', { id: chat.id, content, updateType });
		}
		if (user2Socket) {
			user2Socket.emit('newChatMessageUpdate', { id: chat.id, content, updateType });
		}
	}

	emitMemberUpdate(channelId: number, updateType: UpdateType) {
		this.server.to(`${RoomInitials.channelUpdate}${channelId}`)
			.emit(`newChannelUpdate`, { id: channelId, updateType });
	}

	emitPublicChannelUpdate(content: ChannelPublicDTO, updateType: UpdateType) {
		this.server.to(RoomInitials.publicUpdate)
			.emit('newPublicChannelUpdate', { id: content.id, content, updateType });
	}
	
	emitToClientUpdate(userId: number, channelId: number, updateType: UpdateType) {
		const userSocket = this.connectedUsers.get(userId);
		if (!userSocket) return;

		userSocket.emit(`${RoomInitials.channelUpdate}${channelId}`, { id: channelId, updateType });
	}

	emitToClientPublicUpdate(userId: number, content: ChannelPublicDTO, updateType: UpdateType) {
		const userSocket = this.connectedUsers.get(userId);
		if (!userSocket) return;

		userSocket.emit(RoomInitials.publicUpdate, { id: content.id, content, updateType });
	}

	emitChannelDeleted(channelId: number) {
		this.emitMemberUpdate(channelId, UpdateType.deleted);
		this.server.socketsLeave(`${RoomInitials.channelUpdate}${channelId}`);
		this.server.socketsLeave(`${RoomInitials.channelMessage}${channelId}`);
	}

	emitMemberJoined(channelId: number, userId: number) {
		const userSocket = this.connectedUsers.get(userId);

		if (userSocket) {
			this.handleChannelJoinLeave(channelId, userSocket, 'join');
		}
		this.emitMemberUpdate(channelId, UpdateType.updated);
	}

	emitMemberLeft(userId: number, channelId: number) {
		const userSocket = this.connectedUsers.get(userId);

		if (userSocket) {
			this.handleChannelJoinLeave(channelId, userSocket, 'leave');
			userSocket.emit('newChannelUpdate', { id: channelId, UpdateType: UpdateType.deleted });
		}
		this.emitMemberUpdate(channelId, UpdateType.updated);
	}
}
