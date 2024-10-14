import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { ChannelService } from './channel/channel.service';
import { UserService } from '../user/user.service';
import { authenticateUser, UserSocket } from '../user/user.gateway';
import { NotFoundException, ParseIntPipe, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChannelPublicDTO, ChatClientDTO, MemberClientDTO, MemberPublicDTO, MessagePublicDTO } from '../dto/chat.dto';
import { MemberService } from './channel/member.service';
import { ChannelMember, Chat } from '../entities/chat.entity';
import { ChatService } from './chat.service';
import { InviteService } from './invite/invite.service';
import { UserPublicDTO } from 'src/dto/user.dto';

export enum UpdateType {
	deleted = 'deleted',
	updated = 'updated',
	created = 'created',
}

export enum RoomInitials {
	channelMessage = 'channel#',
	channelUpdate = 'channelUpdate#',
	publicUpdate = 'channelPublicUpdate',
}

type PartialWithId<Type extends { id: number }> = Partial<Type> & { id: number };

type emitUpdateDTO<Type extends { id: number }> = {
	id: number,
	content?: PartialWithId<Type>,
	updateType: UpdateType,
}

@WebSocketGateway(3001, { cors: { origin: "*" } })
export class ChatGateway {
	constructor(
		private readonly userService: UserService,
		private readonly configService: ConfigService,
		private readonly channelService: ChannelService,
		private readonly memberService: MemberService,
		private readonly chatService: ChatService,
		private readonly inviteService: InviteService,
	) { }

	@WebSocketServer()
	server: Server;

	private connectedUsers: Map<number, Set<UserSocket>> = new Map();
	
	@Cron(CronExpression.EVERY_HOUR)
	async checkInvites() {
		const expiredInvites = await this.inviteService.getExpiredInvites();
		await this.inviteService.removeInvite(expiredInvites);
	}

	@Cron(CronExpression.EVERY_MINUTE)
	async checkMutes() {
		const expiredMutes = await this.channelService.getExpiredMutes();

		Promise.all(expiredMutes.map(async (mute) => {
			try {
				await this.channelService.removeMute(mute.userId, mute.channelId);
				const membership = await this.memberService.getMembershipByChannel(mute.channelId, mute.userId, [
					'user',
				]);
				if (membership) {
					this.emitMemberUpdate(mute.channelId, new MemberPublicDTO(membership, false), UpdateType.updated);
				}
			} catch (error) {
				console.error(`Cron: Could not unmute user: ${error.message}`);
			}
		}))
	}

	async handleConnection(client: Socket) {
		try {
			const user = await authenticateUser(client, this.configService, this.userService);
			const userSockets = this.connectedUsers.get(user.id) || new Set();
			userSockets.add(client);
			this.connectedUsers.set(user.id, userSockets);
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
			const userSockets = this.connectedUsers.get(user.id) || undefined;
			if (userSockets) {
				userSockets.delete(client);
			}
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

	@SubscribeMessage('subscribeChannel')
	async onSubscribeChannel(@MessageBody(ParseIntPipe) channelId: number, @ConnectedSocket() client: UserSocket) {
		const user = client.authUser;
		if (!user) {
			throw new UnauthorizedException('Unauthorized: User not found');
		}

		if (!(await this.channelService.isUserInChannel(channelId, user.id))) {
			throw new UnauthorizedException('Unauthorized: User is not in channel');
		}

		this.handleChannelJoinLeave(channelId, client, 'join');
		//console.log(`${user.nameFirst} has subscribed to a channel`);
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

	@SubscribeMessage('sendChannelMessage')
	async onChannelMessage(@MessageBody() data: { message: string, channelId: number }, @ConnectedSocket() client: UserSocket) {
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
  async onChatMessage(client: UserSocket, payload: { receiverId: number, content: string }) {
		try {
			const user = client.authUser;
			if (!user) {
				throw new UnauthorizedException('Unauthorized: User not found');
			}

			const chat = await this.chatService.getChatByUsersId(user.id, payload.receiverId);
			if (!chat) {
				throw new NotFoundException('Chat not found or user is not in chat');
			}

			await this.chatService.validateRelationship(user.id, payload.receiverId);

			const message = await this.chatService.logMessage(chat.id, user, payload.content);
			const publicMessage = new MessagePublicDTO(message);
			this.emitChatMessageUpdate(chat, publicMessage, UpdateType.updated);
		} catch(error) {
			client.emit('chatMessageError', error.message);
		}
  }
	
	handleChannelJoinLeave(channelId: number, client: UserSocket, action: 'join' | 'leave') {
		const channelUpdateRoom = `${RoomInitials.channelUpdate}${channelId}`; 
		const messageUpdateRoom = `${RoomInitials.channelMessage}${channelId}`; 

		if (action === 'join') {
			client.join(channelUpdateRoom);
			client.join(messageUpdateRoom);
		} else {
			client.leave(channelUpdateRoom);
			client.leave(messageUpdateRoom);
		}
		//this.emitOnlineMembers(channelUpdateRoom, channelId);
	}

	emitToClient<Type>(event: string, socket: UserSocket, payload: Type) {
		socket.emit(event, payload);
	}

	emitToUser<Type>(event: string, userId: number, payload: Type) {
		const sockets = this.connectedUsers.get(userId);
		if (!sockets || !sockets.size) return;

		for (const socket of sockets) {
			this.emitToClient(event, socket, payload);
		}
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
		const receiver = chat.users[1];
		this.emitToUser('newChat', receiver.id, new ChatClientDTO(chat, receiver.id));
	}

	emitChannelMessageUpdate(channelId: number, content: MessagePublicDTO, updateType: UpdateType) {
		this.server.to(`${RoomInitials.channelMessage}${channelId}`)
			.emit(`channel${channelId}MessageUpdate`, { id: channelId, content, updateType });
	}

	async emitChatMessageUpdate(
		chat: Chat,
		content: MessagePublicDTO,
		updateType: UpdateType,
	) {
		if (!chat.users || chat.users.length != 2) {
			chat = await this.chatService.getChatById(chat.id, ['users']);
			if (!chat)
				throw new NotFoundException('Chat not found');
		}
		const emitUpdateDTO = { id: chat.id, content, updateType };
		for (const user of chat.users) {
			this.emitToUser('chatMessageUpdate', user.id, emitUpdateDTO);
		}
	}

	emitMemberUpdate(
		channelId: number,
		content: PartialWithId<MemberPublicDTO>,
		updateType: UpdateType,
	) {
		this.server.to(`${RoomInitials.channelUpdate}${channelId}`)
			.emit(`channel${channelId}MemberUpdate`, { id: channelId, content, updateType });
	}

	emitBanListUpdate(
		channelId: number,
		content: PartialWithId<UserPublicDTO>,
		updateType: UpdateType,
	) {
		this.server.to(`${RoomInitials.channelUpdate}${channelId}`)
			.emit(`channel${channelId}BanListUpdate`, { id: channelId, content, updateType });
		const emitUpdateDTO = { id: channelId, isBanned: updateType === UpdateType.created, isJoined: false };
		this.emitToUserUpdate('public', content.id, emitUpdateDTO, UpdateType.updated);
	}

	emitMembershipUpdate(channelId: number, content: PartialWithId<MemberClientDTO>, updateType: UpdateType) {
		this.server.to(`${RoomInitials.channelUpdate}${channelId}`)
			.emit('membershipUpdate', { id: content.id, content, updateType });
	}

	emitChannelUpdate(
		eventType: 'public' | 'client',
		content: PartialWithId<ChannelPublicDTO>,
		updateType: UpdateType
	) {
		this.server
			.to(eventType === 'public' ? RoomInitials.publicUpdate : `${RoomInitials.channelUpdate}${content.id}`)
			.emit(
				eventType === 'public' ? 'publicChannelUpdate' : 'channelUpdate',
				{ id: content.id, content, updateType }
			);
	}
	
	emitToUserUpdate(
		eventType: 'membership' | 'public',
		userId: number,
		content: PartialWithId<MemberClientDTO | ChannelPublicDTO>,
		updateType: UpdateType
	) {
		const emitUpdateDTO = { id: content.id, content, updateType };
		const event = eventType ===  'membership' ? 'membershipUpdate' : 'selectedPublicChannelUpdate';
		this.emitToUser(event, userId, emitUpdateDTO);
	}

	emitChannelDeleted(channelId: number) {
		this.emitChannelUpdate('client', { id: channelId }, UpdateType.deleted);
		this.server.socketsLeave(`${RoomInitials.channelUpdate}${channelId}`);
		this.server.socketsLeave(`${RoomInitials.channelMessage}${channelId}`);
	}



	emitMemberJoined(membership: ChannelMember) {
		const userSockets = this.connectedUsers.get(membership.user.id);
		const emitUpdateDTO: emitUpdateDTO<MemberClientDTO> = {
			id: membership.user.id,
			content: new MemberClientDTO(membership, membership.user.id),
			updateType: UpdateType.created
		};

		if (userSockets) {
			for (const socket of userSockets)  {
				this.handleChannelJoinLeave(membership.channel.id, socket, 'join');
				this.emitToClient('membershipUpdate', socket, emitUpdateDTO);
			}
		}
		this.emitMemberUpdate(membership.channel.id, new MemberPublicDTO(membership), UpdateType.created);
	}

	emitMemberLeft(userId: number, membershipId: number, channelId: number) {
		const userSockets = this.connectedUsers.get(userId);
		const emitMembershipUpdateDTO: emitUpdateDTO<MemberClientDTO> = {
			id: membershipId,
			content: { id: membershipId },
			updateType: UpdateType.deleted
		};
		const emitPublicUpdateDTO: emitUpdateDTO<ChannelPublicDTO> = {
			id: channelId,
			content: { id: channelId, isJoined: false },
			updateType: UpdateType.updated
		};

		if (userSockets && userSockets.size) {
			for (const socket of userSockets)  {
				this.handleChannelJoinLeave(channelId, socket, 'leave');
				this.emitToClient('membershipUpdate', socket, emitMembershipUpdateDTO);
				this.emitToClient('selectedPublicChannelUpdate', socket, emitPublicUpdateDTO);
			}
		}
		this.emitMemberUpdate(channelId, { id: membershipId }, UpdateType.deleted);
	}
}
