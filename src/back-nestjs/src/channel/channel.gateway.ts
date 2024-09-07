import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { ChannelService } from './channel.service';
import { UserService } from '../user/user.service';
import { authenticateUser, UserSocket } from '../user/user.gateway';
import { User } from 'src/entities/user.entity';
import { Channel, ChannelMember, Message } from 'src/entities/channel.entity';

@WebSocketGateway(3001, { cors: { origin: "*" } })
export class ChannelGateway {
	constructor(private readonly userService: UserService,
				private readonly configService: ConfigService,
				private readonly channelService: ChannelService,
			   ) { }

	@WebSocketServer()
	server: Server;

	async handleConnection(client: Socket) {
		try {
			const	user = await authenticateUser(client, this.configService, this.userService);
			const	memberships = await this.channelService.getMemberships(user);

			memberships?.forEach((userChannel: ChannelMember) => {
				client.join(`channel#${userChannel.channel.id}`);
				console.log(`${user.nameFirst} has joined channel ${userChannel.channel.name}`);
			}
		);
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

	@SubscribeMessage('joinRoom')
	async onRefresh(@MessageBody() channelId: number, @ConnectedSocket() client: UserSocket) {
		const user = client.authUser;
		if (!user) {
			console.log('unknown user');
			return;
		}
		
		const channel = await this.channelService.getChannelById(channelId, ['members', 'members.user']);
		if (!channel) {
			console.log('channel does not exist');
			return;
		}

		for (const membership of channel.members) {
			if (membership?.user?.id === user.id) {
				client.join(`channel#${channelId}`);
				console.log(`${user.nameFirst} has joined channel ${channelId}`);
				break;
			}
		}
	}

	@SubscribeMessage('message')
	async onMessage(@MessageBody() data: { message: string, channelId: number }, @ConnectedSocket() client: UserSocket) {
		const user = client.authUser;
		if (!user) {
			console.log('unknown user');
			return;
		}

		let message: Message;
		try {
			message = await this.channelService.logMessage(data.channelId, user, data.message);
			this.server.to(`channel#${data.channelId}`).emit(`room${data.channelId}Message`, message);
		} catch (error) {
			console.log(error.message);
			return;
		}
	}
}
