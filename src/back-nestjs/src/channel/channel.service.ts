import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'
import { Channel, ChannelMember, ChannelRoles, ChannelType, Message } from '../entities/channel.entity';
import { UserService } from '../user/user.service';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';

@Injectable()
export class ChannelService {
	constructor(
		@InjectRepository(Channel)
		private channelRespitory: Repository<Channel>,
		@InjectRepository(ChannelMember)
		private memberRespitory: Repository<ChannelMember>,
		@InjectRepository(Message)
		private messageRespitory: Repository<Message>,
		private readonly userService: UserService,
	) {}

	async createChannel(creator: User, newName: string, newPassword: string): Promise<Channel> {
		const newChannel = this.channelRespitory.create({
			name: newName,
			password: newPassword,
			members: [],
			log: [],
		});
		try {
			await this.channelRespitory.save(newChannel);
		} catch(error) {
			throw new Error(`Failed to save channel, ${error.message}`);
		}

		const newMember = this.memberRespitory.create({
			role: ChannelRoles.admin,
			user: creator,
			channel: newChannel,
		})
		try {
			await this.memberRespitory.save(newMember);
		} catch(error) {
			await this.channelRespitory.delete(newChannel.id);
			throw new Error(`Failed to save owner, ${error.message}`);
		}
		return (newChannel);
	}

	async getChannelById(channelId: number, requestedRelations: string[] | null): Promise<Channel> {
		const channel = await this.channelRespitory.findOne({
			where: { id: channelId },
			relations: requestedRelations,
		});
		return (channel);
	}

	async getAllChannels(user: User): Promise<Channel[]> {
		let channels: Channel[];
		user.channels.forEach((channelMembership: ChannelMember) => {
			channels.push(channelMembership.channel);
		});
		return (channels);
	}

	async getPublicChannels(): Promise<Channel[]> {
		return (await this.channelRespitory.find({
			where: { type: ChannelType.public },
		}));
	}

	async createChannelMember(channelId: number, invitorId: number, inviteeId: number): Promise<Channel> {
		const channel = await this.getChannelById(channelId, ['members', 'members.user']);
		if (!channel)
			throw new Error('Channel not found');

		const invitor = channel.members.find(member => member.user.id === invitorId);
		if (!invitor || invitor.role > ChannelRoles.moderator)
			throw new Error('Unauthorized invitor');

		const invitee = await this.userService.getUserById(inviteeId);
		if (!invitee)
			throw new Error('user not found');

		const newMember = this.memberRespitory.create({
			user: invitee,
			channel: channel,
		})
		await this.memberRespitory.save(newMember);
		return (channel);
	}

	async logMessage(channelId: number, author: User, message: string): Promise<Message> {
		const channel = await this.getChannelById(channelId, ['members', 'members.user']);
		if (!channel)
			throw new Error('Channel not found');

		const memberStatus = channel.members.find(member => member.user.id === author.id);
		if (!memberStatus)
			throw new Error('Unauthorized author');

		const newMessage = this.messageRespitory.create({
			channel: channel,
			author: author,
			content: message,
		})
		console.log(`${author.nameFirst} said "${message}" and has been logged`);
		return (this.messageRespitory.save(newMessage));
	}
}
