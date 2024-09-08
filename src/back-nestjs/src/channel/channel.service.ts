import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'
import { Channel, ChannelMember, ChannelRoles, ChannelType, Message } from '../entities/channel.entity';
import { UserService } from '../user/user.service';
import { DeleteResult, Not, Repository, UpdateResult } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateChannelDto, UpdateChannelDto, UpdateMemberDto } from '../dto/channel.dto';
import path from 'path';
import { unlinkSync, writeFileSync } from 'fs';

const createImage = (channelId: number, image: Express.Multer.File) => {
	const timestamp = Date.now();
	const fileExtension = path.extname(image.originalname);
	const fileName = `${timestamp}_channel${channelId}${fileExtension}`;
	const uploadPath = path.join('/app/uploads', fileName);

	writeFileSync(uploadPath, image.buffer);
	return ({ fileName: fileName, path: uploadPath });
}

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

	async getMembershipByChannel(channelId: number, userId: number): Promise<ChannelMember> {
		const membership = await this.memberRespitory.createQueryBuilder('membership')
		.innerJoin('membership.user', 'user')
		.where('user.id = :id', { id: userId })
		.leftJoinAndSelect('membership.channel', 'channel')
		.where('channel.id = :id', { id: channelId })
		.getOne()

		return (membership);
	}

	async getMemberships(user: User): Promise<ChannelMember[]> {
		const userMemberships = await this.memberRespitory.createQueryBuilder('membership')
		.innerJoin('membership.user', 'user')
		.leftJoinAndSelect('membership.channel', 'channel')
		.leftJoinAndSelect('channel.banList', 'banList')
		.leftJoinAndSelect('channel.members', 'members')
		.leftJoinAndSelect('members.user', 'users')
		.where('user.id = :id', { id: user.id })
		.getMany();
		
		return (userMemberships);
	}

	async getPublicChannels(): Promise<Channel[]> {
		return (await this.channelRespitory.find({
			where: [
				{ type: ChannelType.public },
				{ type: ChannelType.protected },
			]
		}));
	}

	async createChannel(creator: User, createChannelDto: CreateChannelDto, image: Express.Multer.File): Promise<Channel> {
		let newChannel: Channel = this.channelRespitory.create(createChannelDto);
		let newMember: ChannelMember;

		newChannel.name = newChannel.name.replace(/\s+/g, ' ').trim();
		try {
			newChannel = await this.channelRespitory.save(newChannel);

			newMember = this.memberRespitory.create({
				role: ChannelRoles.admin,
				user: creator,
				channel: newChannel
			})
			await this.memberRespitory.save(newMember);

			if (image) {
				const { fileName } = createImage(newChannel.id, image);

				newChannel.image = fileName;
				await this.channelRespitory.save(newChannel);
			}
		} catch(error) {
			if (newChannel.id) {
				await this.channelRespitory.delete(newChannel.id);
			}
			if (newMember.id) {
				await this.memberRespitory.delete(newMember.id);
			}
			throw new InternalServerErrorException(`Failed to create channel and associate member: ${error.message}`);
		}
		return (newChannel);
	}

	async joinChannel(user: User, channelId: number, password?: string | null): Promise<ChannelMember> {
		const channel = await this.getChannelById(channelId, ['members.user', 'banList']);
		if (!channel) {
			throw new NotFoundException(`Channel not found`);
		}

		if (channel.type === 'private') {
			throw new UnauthorizedException('This channel is private');
		}
		const isBanned = channel.banList.some((bannedUser) => bannedUser.id === user.id)
		if (isBanned) {
			throw new UnauthorizedException('You are banned from this channel');
		}

		const isMember = channel.members.some(member => member.user.id === user.id);
		if (isMember) {
			throw new BadRequestException(`User is already in channel`);
		}
		if (channel.type === 'protected' && password !== channel.password) {
			throw new BadRequestException('Incorrect password');
		}

		return (await this.addChannelMember(channel, user));
	}

	async leaveChannel(user: User, membershipId: number): Promise<Channel | ChannelMember> {
		const memberships = await this.getMemberships(user);
		const membership = memberships.find((membership) => membership.id == membershipId);
		if (!membership) {
			throw new NotFoundException('Membership not found');
		}

		if (membership.role  === ChannelRoles.admin) {
			const channel = membership.channel;

			if (channel.members.length === 1) {
				return (await this.removeChannel(channel.id));
			}

			let candidate = channel.members.find((member) => member.role === ChannelRoles.moderator);
			if (!candidate) {
				candidate = channel.members[1];
			}
			await this.transferOwnership(user, candidate.user.id, channel.id);
		}
		return (await this.removeMember(membership));
	}

	async removeChannel(channelId: number) {
		let channel = await this.getChannelById(channelId, ['members', 'log', 'banList']);
		if (!channel) {
			throw new NotFoundException('Channel not found');
		}

		try {
			if (channel.log) {
				await this.messageRespitory.remove(channel.log);
			}
			if (channel.members) {
				await this.memberRespitory.remove(channel.members);
			}
			channel = await this.channelRespitory.remove(channel);
			if (channel.image) {
				console.log('image deleted');
				const imagePath = path.join('/app/uploads', channel.image);
				unlinkSync(imagePath);
			}
		} catch(error) {
			throw new InternalServerErrorException(`Could not delete channel: ${error.message}`);
		}
		return (channel);
	}

	async removeMember(member: number | ChannelMember): Promise<ChannelMember> {
		if (typeof(member) === 'number') {
			member = await this.memberRespitory.findOne({ where: { id: member } });
			if (!member) {
				throw new BadRequestException('Member not found');
			}
		}

		try {
			return (await this.memberRespitory.remove(member));
		} catch(error) {
			throw new InternalServerErrorException('Could not delete membership');
		}
	}

	async muteMember(muter: User, victimId: number, channelId: number): Promise<UpdateResult> {
		const muterMembership = await this.getMembershipByChannel(channelId, muter.id);
		if (!muterMembership)
			throw new NotFoundException('User or Channel not found');
		const victimMembership = await this.getMembershipByChannel(channelId, victimId);
		if (!victimMembership)
			throw new NotFoundException('Victim not found');

		if (muterMembership.role > victimMembership.role)
			throw new UnauthorizedException('Unauthorized user')

		return (await this.memberRespitory.update(victimId, { muted: !victimMembership.muted }));
	}
	
	async kickMember(kicker: User, victimId: number, channelId: number): Promise<ChannelMember> {
		const kickerMembership = await this.getMembershipByChannel(channelId, kicker.id);
		if (!kickerMembership)
			throw new NotFoundException('User or Channel not found');
		const victimMembership = await this.getMembershipByChannel(channelId, victimId);
		if (!victimMembership)
			throw new NotFoundException('Victim not found');

		if (kickerMembership.role > victimMembership.role)
			throw new UnauthorizedException('Unauthorized user')
		return (await this.removeMember(victimMembership));
	}

	async banUser(user: User, victimId: number, channelId: number): Promise<ChannelMember> {
		let result: ChannelMember;

		const channel = await this.getChannelById(channelId, ['members', 'members.user', 'banList']);
		if (!channel)
			throw new NotFoundException('Channel not found');
		const userMembership = channel.members.find((membership) => membership.user.id === user.id)
		if (!userMembership) {
			throw new NotFoundException('User not found');
		}
		const victimMembership = channel.members.find((membership) => membership.user.id === victimId)
		if (!victimMembership) {
			throw new NotFoundException('Victim not found');
		}

		if (userMembership.role > victimMembership.role) {
			throw new UnauthorizedException('Unauthorized user');
		}

		const alreadyBanned = channel.banList.some((user) => user.id === victimId)
		if (alreadyBanned) {
			throw new BadRequestException(`${victimMembership.user.nameFirst} is already banned from this channel`);
		}

		try {
			result = await this.removeMember(victimMembership)
			channel.banList.push(victimMembership.user);
			await this.channelRespitory.save(channel);
		} catch(error) {
			throw new InternalServerErrorException(`Banning ${victimMembership.user.nameFirst} failed`);
		}
		return (result);
	}

	async transferOwnership(user: User, newOwnerId: number, channelId: number): Promise<ChannelMember[]> {
		const admin = await this.getMembershipByChannel(channelId, user.id);
		const newAdmin = await this.getMembershipByChannel(channelId, newOwnerId);
		if (!admin || newAdmin) {
			throw new NotFoundException('User(s) not found');
		}

		if (admin.role !== ChannelRoles.admin) {
			throw new UnauthorizedException('Unauthorized user');
		}

		admin.role = ChannelRoles.moderator;
		newAdmin.role = ChannelRoles.admin;
		try {
			const members = [admin, newAdmin];
			return (await this.memberRespitory.save(members));
		} catch (error) {
			throw new InternalServerErrorException(`Could not transfer ownership: ${error.message}`);
		}
	}

	async addChannelMember(channel: Channel, user: User): Promise<ChannelMember> {
		const newMember = this.memberRespitory.create({
			user: user,
			channel: channel,
		})
		try {
			return (await this.memberRespitory.save(newMember));
		} catch(error) {
			throw new InternalServerErrorException('Failed to create new channel member');
		}
	}

	async updateChannel(user: User, channelId: number, updateChannelDto: UpdateChannelDto, image: Express.Multer.File): Promise<UpdateResult> {
		const membership = await this.getMembershipByChannel(channelId, user.id);
		if (!membership) {
			throw new UnauthorizedException('Unauthorized user');
		}

		const isMod = membership.role < ChannelRoles.member;
		const isAdmin = membership.role === ChannelRoles.admin;
		if (!isMod || ((updateChannelDto.type || updateChannelDto.password) && !isAdmin)) {
			throw new UnauthorizedException('Unauthorized user');
		}

		if (image) {
			const channel  = membership.channel;
			let newImage: string = undefined;
			let uploadPath: string;

			try {
				const { fileName, path } = createImage(channel.id, image);
				newImage = fileName;
				uploadPath = path;
				await this.channelRespitory.update(channelId, { image: newImage });
			} catch (error) {
				if (newImage) {
					unlinkSync(uploadPath);
				}
				throw new InternalServerErrorException(`Updating channel failed: ${error.message}`);
			}
		}

		if (updateChannelDto.name) {
			updateChannelDto.name = updateChannelDto?.name.replace(/\s+/g, ' ').trim();
		}
		return (await this.channelRespitory.update(channelId, updateChannelDto));
	}

	async updateMember(user: User, memberId: number, updateMemberDto: UpdateMemberDto): Promise<UpdateResult> {
		const selectedMember = await this.memberRespitory.findOne({
			where: { id: memberId },
			relations: ['channel', 'channel.members'],
		});
		if (!selectedMember) {
			throw new NotFoundException('Member not found');
		}

		const userMembership = await this.getMembershipByChannel(selectedMember.channel.id, user.id);
		if (!userMembership) {
			throw new NotFoundException('User membership not found');
		}

		if (userMembership.id === selectedMember.id) {
			throw new BadRequestException('User changing its own membership, Stop messing around!');
		}

		if (userMembership.role > selectedMember.role) {
			throw new UnauthorizedException('Unauthorized user');
		}

		return (this.memberRespitory.update(memberId, updateMemberDto));
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
