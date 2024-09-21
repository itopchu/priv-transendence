import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnauthorizedException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm';
import {
	Channel,
	ChannelMember,
	ChannelRoles,
	ChannelType,
	Message,
    Mute
} from '../../entities/chat.entity';
import {
	CreateChannelDto,
	UpdateChannelDto,
} from '../../dto/chat.dto';
import { MessageService } from '../message/message.service';
import { MemberService } from './member.service';
import { User } from '../../entities/user.entity';
import { unlinkSync, writeFileSync } from 'fs';
import * as argon2 from 'argon2'
import path from 'path';
import { UserService } from '../../user/user.service';

const createImage = (channelId: number, image: Express.Multer.File) => {
	const timestamp = Date.now();
	const fileExtension = path.extname(image.originalname);
	const fileName = `${timestamp}_channel${channelId}${fileExtension}`;
	const uploadPath = path.join('/app/uploads', fileName);

	writeFileSync(uploadPath, image.buffer);
	return ({ fileName: fileName, imagePath: uploadPath });
}

@Injectable()
export class ChannelService {
	constructor(
		@InjectRepository(Channel)
		private channelRespitory: Repository<Channel>,
		@InjectRepository(Mute)
		private muteRespitory: Repository<Mute>,
		private readonly messageService: MessageService,
		private readonly memberService: MemberService,
		private readonly userService: UserService,
	) {}

	async verifyPassword(plainPassword: string, hashPassword: string): Promise<Boolean> {
		try {
			return (await argon2.verify(hashPassword, plainPassword));
		} catch (error) {
			console.warn(error.message);
			throw new InternalServerErrorException('Error verifying password');
		}
	}

	async hashPassword(password: string): Promise<string> {
		try {
			return (await argon2.hash(password));
		} catch (error) {
			console.warn(error.message);
			throw new InternalServerErrorException('Error hashing password');
		}
	}

	async getChannelById(channelId: number, requestedRelations: string[] | null): Promise<Channel> {
		const channel = await this.channelRespitory.findOne({
			where: { id: channelId },
			relations: requestedRelations,
		});
		return (channel);
	}

	async getMuteById(userId: number, channelId: number): Promise<Mute> {
		const mute = await this.muteRespitory.createQueryBuilder('mute')
		.where('mute.userId = :userId', { userId })
		.andWhere('mute.channelId = :channelId', { channelId })
		.getOne()

		return (mute);
	}

	async getExpiredMutes() {
		const now = new Date();

		const expiredMutes = await this.muteRespitory.createQueryBuilder('mute')
		.where('mute.muteUntil <= :now', { now })
		.getMany()

		return (expiredMutes);
	}

	async getPublicChannels(): Promise<Channel[]> {
		return (await this.channelRespitory.find({
			where: [
				{ type: ChannelType.public },
				{ type: ChannelType.protected },
			],
			relations: ['bannedUsers'],
		}));
	}

	async createChannel(creator: User, createChannelDto: CreateChannelDto, image: Express.Multer.File): Promise<Channel> {
		let newChannel: Channel = this.channelRespitory.create(createChannelDto);
		let newMember: ChannelMember;

		newChannel.name = newChannel.name.replace(/\s+/g, ' ').trim();
		try {
			newChannel = await this.channelRespitory.save(newChannel);
			newMember = await this.memberService.createMember(newChannel, creator, ChannelRoles.admin);

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
				await this.memberService.deleteMember(newMember.id);
			}
			throw new InternalServerErrorException(`Failed to create channel and associate member: ${error.message}`);
		}
		newChannel.members = [newMember];
		return (newChannel);
	}

	async createMute(victimId: number, channelId: number, expireDate: Date | null) {
		const alreadyMuted = await this.getMuteById(victimId, channelId);
		if (alreadyMuted) {
			throw new BadRequestException('User is already muted');
		}

		let newMute: Mute = this.muteRespitory.create({
			userId: victimId,
			channelId: channelId,
			user: { id: victimId },
			channel: { id: channelId },
			muteUntil: expireDate,
		});

		try {
			return (await this.muteRespitory.save(newMute));
		} catch (error) {
			throw new InternalServerErrorException(`Could not mute user: ${error.message}`);
		}
	}

	async joinChannel(user: User, channelId: number, password?: string | null): Promise<ChannelMember> {
		const channel = await this.getChannelById(channelId, ['members.user', 'bannedUsers']);
		if (!channel) {
			throw new NotFoundException(`Channel not found`);
		}

		if (channel.type === 'private') {
			throw new UnauthorizedException('This channel is private');
		}
		const isBanned = channel.bannedUsers.some((bannedUser) => bannedUser.id === user.id)
		if (isBanned) {
			throw new UnauthorizedException('You are banned from this channel');
		}

		const isMember = channel.members.some(member => member.user.id === user.id);
		if (isMember) {
			throw new BadRequestException(`User is already in channel`);
		}
		if (channel.type === 'protected' && !(await this.verifyPassword(password, channel.password))) {
			throw new BadRequestException('Incorrect password');
		}

		return (await this.memberService.createMember(channel, user));
	}

	async leaveChannel(user: User, membership: ChannelMember) {
		if (membership.role  === ChannelRoles.admin) {
			let channel: Channel;

			if (!membership.channel) {
				membership = await this.memberService.getMembershipById(membership.id, [
					'channel',
					'channel.members', 
					'channel.members.user'
				]);
				channel = membership.channel;
			} else if (!membership.channel.members) {
				channel = await this.getChannelById(membership.channel.id, ['members', 'members.user'])
			}

			if (channel.members.length === 1) {
				return (await this.removeChannel(channel.id));
			}

			let candidate = channel.members.find((member) => member.role === ChannelRoles.moderator);
			if (!candidate) {
				candidate = channel.members[1];
			}
			await this.transferOwnership(user, candidate.user.id, channel.id);
		}
		return (await this.memberService.removeMember(membership) as ChannelMember);
	}

	async removeChannel(channelId: number) {
		let channel = await this.getChannelById(channelId, ['members', 'log', 'bannedUsers', 'mutedUsers']);
		if (!channel) {
			throw new NotFoundException('Channel not found');
		}

		try {
			if (channel.mutedUsers) {
				await this.muteRespitory.remove(channel.mutedUsers);
			}
			if (channel.log) {
				await this.messageService.removeMessages(channel.log);
			}
			if (channel.members) {
				await this.memberService.removeMember(channel.members);
			}
			if (channel.image) {
				const imagePath = path.join('/app/uploads', channel.image);
				unlinkSync(imagePath);
			}
			channel = await this.channelRespitory.remove(channel);
		} catch(error) {
			throw new InternalServerErrorException(`Could not delete channel: ${error.message}`);
		}
		return (channel);
	}

	async removeMute(userId: number, channelId: number) {
		const mute = await this.getMuteById(userId, channelId);
		if (!mute) {
			return (null);
		}

		return (await this.muteRespitory.remove(mute));
	}

	async muteMember(muter: User, victimId: number, muteUntil: number | null, channelId: number): Promise<Mute> {
		const muterMembership = await this.memberService.getMembershipByChannel(channelId, muter.id, []);
		if (!muterMembership) {
			throw new NotFoundException('User or Channel not found');
		}
		const victimMembership = await this.memberService.getMembershipByChannel(channelId, victimId, []);
		if (!victimMembership) {
			throw new NotFoundException('Victim not found');
		}

		if (muterMembership.role > victimMembership.role) {
			throw new UnauthorizedException('Unauthorized: Insufficient privileges')
		}

		try {
			const isMuted = await this.removeMute(victimId, channelId);
			if (isMuted) {
				return (isMuted);
			}
		} catch (error) {
			throw new InternalServerErrorException(`Could not unmute user: ${error.message}`);
		}
		const expireDate = muteUntil ? new Date(Date.now() + muteUntil * 60 * 1000) : null;
		return (await this.createMute(victimId, channelId, expireDate));
	}
	
	async kickMember(kicker: User, victimId: number, channelId: number) {
		const kickerMembership = await this.memberService.getMembershipByChannel(channelId, kicker.id, []);
		if (!kickerMembership)
			throw new NotFoundException('User or Channel not found');
		const victimMembership = await this.memberService.getMembershipByChannel(channelId, victimId, []);
		if (!victimMembership)
			throw new NotFoundException('Victim not found');

		if (kickerMembership.role > victimMembership.role)
			throw new UnauthorizedException('Unauthorized user')
		return (await this.memberService.removeMember(victimMembership));
	}

	async unbanUser(victimId: number, channel: Channel) {
		let result: ChannelMember;

		const victim = await this.userService.getUserById(victimId);
		if (!victim) {
			throw new NotFoundException('User not found');
		}
		try {
			await this.channelRespitory.createQueryBuilder()
			.relation(Channel, 'bannedUsers')
			.of(channel)
			.remove(victim)
		} catch(error) {
			throw new InternalServerErrorException(`Unbanning ${victim.nameFirst} failed`);
		}
		return (result);
	}

	async banUser(victimMembership: ChannelMember, channel: Channel) {
		let result: ChannelMember;

		try {
			result = await this.memberService.removeMember(victimMembership) as ChannelMember;
			await this.channelRespitory.createQueryBuilder()
			.relation(Channel, 'bannedUsers')
			.of(channel)
			.add(victimMembership.user)
		} catch(error) {
			throw new InternalServerErrorException(`Banning ${victimMembership.user.nameFirst} failed`);
		}
		return (result);
	}

	async transferOwnership(user: User, newOwnerId: number, channelId: number): Promise<ChannelMember[]> {
		const admin = await this.memberService.getMembershipByChannel(channelId, user.id, []);
		const newAdmin = await this.memberService.getMembershipByChannel(channelId, newOwnerId, []);
		if (!admin || !newAdmin) {
			throw new NotFoundException('User(s) not found');
		}

		if (admin.role !== ChannelRoles.admin) {
			throw new UnauthorizedException('Unauthorized: User is not an admin');
		}

		admin.role = ChannelRoles.moderator;
		newAdmin.role = ChannelRoles.admin;
		try {
			const members = [admin, newAdmin];
			return (await this.memberService.saveMembers(members));
		} catch (error) {
			throw new InternalServerErrorException(`Could not transfer ownership: ${error.message}`);
		}
	}

	async updateChannel(user: User, channelId: number, updateChannelDto: UpdateChannelDto, image: Express.Multer.File) {
		const membership = await this.memberService.getMembershipByChannel(channelId, user.id, ['channel']);
		if (!membership) {
			throw new UnauthorizedException('Unauthorized user');
		}

		const isMod = membership.role < ChannelRoles.member;
		const isAdmin = membership.role === ChannelRoles.admin;
		if (!isMod || ((updateChannelDto.type || updateChannelDto.password) && !isAdmin)) {
			throw new UnauthorizedException('Unauthorized user');
		}

		if (image) {
			const channel = membership.channel;
			let newImage: string = undefined;
			let uploadPath: string;

			try {
				const { fileName, imagePath } = createImage(channel.id, image);
				newImage = fileName;
				uploadPath = imagePath;
				await this.channelRespitory.update(channelId, { image: newImage });
				if (channel.image) {
					const oldImagePath = path.join('/app/uploads', channel.image);
					unlinkSync(oldImagePath);
				}
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
		await this.channelRespitory.update(channelId, updateChannelDto);
		return (membership.channel);
	}

	async logMessage(channelId: number, author: User, message: string): Promise<Message> {
		if (!message?.length) {
			throw new BadRequestException('Empty message');
		}

		const channel = await this.getChannelById(channelId, ['members', 'members.user']);
		if (!channel)
			throw new NotFoundException('Channel not found');

		const isMember = channel.members.find(member => member.user.id === author.id);
		if (!isMember) {
			throw new UnauthorizedException('Unauthorized: Membership not found');
		}
		const isMuted = await this.getMuteById(author.id, channelId);
		if (isMuted) {
			throw new UnauthorizedException('Unauthorized: User is muted');
		}

		return (await this.messageService.createMessage(channel, author, message));
	}
}
