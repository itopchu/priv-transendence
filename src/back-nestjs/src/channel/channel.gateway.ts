import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, ConnectedSocket } from '@nestjs/websockets'; import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { ChannelService } from './channel.service';
import { UserService } from '../user/user.service';
import { authenticateUser, UserSocket } from '../user/user.gateway';
import { ParseIntPipe, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChannelPublicDTO, MessagePublicDTO } from '../dto/channel.dto';

export enum UpdateType {
	deleted = 'deleted',
	updated = 'updated',
}

@WebSocketGateway(3001, { cors: { origin: "*" } })
export class ChannelGateway {
	constructor(private readonly userService: UserService,
				private readonly configService: ConfigService,
				private readonly channelService: ChannelService,
			   ) { }

	@WebSocketServer()
	server: Server;
	
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
			await authenticateUser(client, this.configService, this.userService);
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

		const membership = await this.channelService.getMembershipByChannel(channelId, user.id);
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

		const membership = await this.channelService.getMembershipByChannel(channelId, user.id);
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

	getUserSocketInRoom(userId: number, room: string): UserSocket | null {
		const roomSockets = this.server.sockets.adapter.rooms.get(room);
		if (!roomSockets) return (null);

		for (const socketId of roomSockets) {
			const socket: UserSocket = this.server.sockets.sockets.get(socketId);
			if (socket && socket.authUser.id === userId) {
				return (socket)
			}
		}
		return (null);
	}

	emitChannelUpdate(channelId: number) {
		this.server.to(`channelUpdate#${channelId}`).emit(`newChannelUpdate`, channelId);
	}

	emitPublicChannelUpdate(channel: ChannelPublicDTO, updateType: UpdateType) {
		console.log(channel);
		this.server.to('channelPublicUpdate').emit('newPublicChannelUpdate', {channel: channel, updateType: updateType });
	}

	emitChannelDeleted(channelId: number) {
		this.emitChannelUpdate(channelId);
		this.server.socketsLeave(`channelUpdate#${channelId}`);
		this.server.socketsLeave(`channel#${channelId}`);
	}

	emitMemberLeft(userId: number, channelId: number) {
		const userSocket = this.getUserSocketInRoom(userId, `channelUpdate#${channelId}`)
			|| this.getUserSocketInRoom(userId, `channel#${channelId}`)

		this.emitChannelUpdate(channelId);
		if (userSocket) {
			userSocket.leave(`channelUpdate#${channelId}`);
			userSocket.leave(`channel#${channelId}`);
		}
	}
}
