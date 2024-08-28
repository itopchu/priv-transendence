import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'
import { Channel, ChannelMember, ChannelRoles, ChannelType, Message } from '../entities/channel.entity';
import { UserService } from '../user/user.service';
import { DeleteResult, Not, Repository, UpdateResult } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { CreateChannelDto, UpdateChannelMemberDto } from '../dto/channel.dto';

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

	async getChannelLog(channelId: number): Promise<Message[]>  {
		const log = await this.messageRespitory.createQueryBuilder('msg')
		.innerJoin('msg.channel', 'channel')
		.leftJoinAndSelect('msg.author', 'author')
		.where('channel.id =  :id', { id: channelId })
		.getMany();

		return (log);
	}

	async getChannelById(channelId: number, requestedRelations: string[] | null): Promise<Channel> {
		const channel = await this.channelRespitory.findOne({
			where: { id: channelId },
			relations: requestedRelations,
		});
		return (channel);
	}

	async getMemberships(user: User): Promise<ChannelMember[]> {
		const userMemberships = await this.memberRespitory.createQueryBuilder('member')
		.innerJoin('member.user', 'user')
		.leftJoinAndSelect('member.channel', 'channel')
		.where('user.id = :id', { id: user.id })
		.getMany();

		return (userMemberships);
	}

	async getPublicChannels(): Promise<Channel[]> {
		return (await this.channelRespitory.find({
			where: [
				{ type: 'public' },
				{ type: 'protected' },
			]
		}));
	}

	async createChannel(creator: User, createChannelDto: CreateChannelDto): Promise<Channel> {
		let newChannel: Channel = this.channelRespitory.create(createChannelDto);

		try {
			newChannel = await this.channelRespitory.save(newChannel);

			const newMember = this.memberRespitory.create({
				role: ChannelRoles.admin,
				user: creator,
				channel: newChannel
			})
			await this.memberRespitory.save(newMember);
		} catch(error) {
			if (newChannel.id)
				await this.channelRespitory.delete(newChannel.id);
			throw new Error(`Failed to create channel and associate member: ${error.message}`);
		}
		return (newChannel);
	}

	async joinChannel(user: User, channelId: number, password?: string | null): Promise<ChannelMember> {
		const channel = await this.getChannelById(channelId, ['members.user', 'banList']);
		if (!channel) {
			throw new NotFoundException(`channel id ${channelId} not found`);
		}

		if (channel.type === 'private') {
			throw new UnauthorizedException('This channel is private');
		}
		const isBanned = channel.banList.some((bannedUser) => bannedUser.id === user.id)
		if (isBanned) {
			throw new UnauthorizedException('You are banned from this channel');
		}

		const isMember = channel.members.some(member => member.user.id === user.id);
		if (isMember)
			throw new BadRequestException(`User is already in channel`);
		if (channel.type === 'protected' && password !== channel.password)
			throw new BadRequestException('Wrong password');

		return (await this.addChannelMember(channel, user));
	}


	async addChannelMember(channel: Channel, user: User): Promise<ChannelMember> {
		const newMember = this.memberRespitory.create({
			user: user,
			channel: channel,
		})
		try {
			return (await this.memberRespitory.save(newMember));
		} catch(error) {
			throw new Error('Failed to create new channel member');
		}
	}

	async deleteMember(memberId: number) {
		try {
			return (await this.memberRespitory.delete(memberId));
		} catch(error) {
			throw new InternalServerErrorException('Could not delete membership');
		}
	}
	
	async kickMember(kicker: User, kickeeId: number, channelId: number): Promise<DeleteResult> {
		const channel = await this.getChannelById(channelId, ['members', 'members.user']);
		if (!channel)
			throw new NotFoundException('Channel not found');

		const kickerMembership = channel.members.find((membership) => membership.user.id === kicker.id)
		if (!kickerMembership)
			throw new NotFoundException('User not found');
		const kickeeMembership = channel.members.find((membership) => membership.user.id === kickeeId)
		if (!kickeeMembership)
			throw new NotFoundException('Kickee not found');

		if (kickerMembership.role > kickeeMembership.role)
			throw new UnauthorizedException('Unauthorized user')
		return (await this.deleteMember(kickeeMembership.id));
	}

	async banUser(user: User, baneeId: number, channelId: number): Promise<DeleteResult> {
		let result: DeleteResult;

		const channel = await this.getChannelById(channelId, ['members', 'members.user', 'banList']);
		if (!channel)
			throw new NotFoundException('Channel not found');

		const userMembership = channel.members.find((membership) => membership.user.id === user.id)
		if (!userMembership) {
			throw new NotFoundException('User not found');
		}
		const baneeMembership = channel.members.find((membership) => membership.user.id === baneeId)
		if (!baneeMembership) {
			throw new NotFoundException('Banee not found');
		}

		if (userMembership.role > baneeMembership.role) {
			throw new UnauthorizedException('Unauthorized user');
		}

		const alreadyBanned = channel.banList.some((user) => user.id === baneeId)
		if (alreadyBanned) {
			throw new BadRequestException(`${baneeMembership.user.nameFirst} is already banned from this channel`);
		}

		try {
			result = await this.deleteMember(baneeMembership.id)
			channel.banList.push(baneeMembership.user);
			await this.channelRespitory.save(channel);
		} catch(error) {
			throw new InternalServerErrorException(`Banning ${baneeMembership.user.nameFirst} failed`);
		}
		return (result);
	}

	async updateMember(user: User, memberId: number, UpdateChannelMemberDto: UpdateChannelMemberDto): Promise<UpdateResult> {
		const selectedMember = await this.memberRespitory.findOne({
			where: { id: memberId },
			relations: ['channel', 'channel.members'],
		});
		if (!selectedMember) {
			throw new NotFoundException('Member not found');
		}

		const memberships = await this.getMemberships(user);
		const userMembership = memberships.find((membership) => membership.channel.id === selectedMember.channel.id);
		if (!userMembership) {
			throw new NotFoundException('User membership not found');
		}

		if (userMembership.id === selectedMember.id) {
			throw new BadRequestException('User changing its own membership, Stop messing around!');
		}

		if (userMembership.role > selectedMember.role) {
			throw new UnauthorizedException('Unauthorized user');
		}
		return (this.memberRespitory.update(memberId, UpdateChannelMemberDto));
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
