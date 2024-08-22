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
		let user: User;
		try {
			user = await authenticateUser(client, this.configService, this.userService);
			console.log('Client connected to channels:', user.nameFirst, client.id);
		} catch (error) {
			client.disconnect(true);
			console.log(error.message);
			return (false);
		}
		if (user.channels) {
			user.channels.forEach((userChannel: ChannelMember) => {
				client.join(`channel#${userChannel.channel.id}`);
			});
		}
		return (true);
	}

	handleDisconnect(client: UserSocket) {
		const user = client.authUser;
		console.log('Client disconnected from channels:', user?.nameFirst, client.id);
		if (user) {
			const rooms = Array.from(client.rooms);
			rooms.forEach(room => {
				client.leave(room);
			});
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
		} catch (error) {
			console.log(error.message);
			return;
		}
		this.server.to(`channel#${data.channelId}`).emit(message.author.nameFirst, message.content);
		console.log(`${user.nameFirst} said "${message.content}"`);
	}
}
