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
import { InviteService } from '../invite/invite.service';

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
		private readonly inviteService: InviteService,
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
	
	async memberCount(channelId: number): Promise<number> {
		const count = await this.channelRespitory
			.createQueryBuilder('channel')
			.where('channel.id = :channelId', { channelId })
			.innerJoin('channel.members', 'members')
			.getCount();

		return (count);
	}

	async isUserBanned(channelId: number, userId: number): Promise<boolean> {
		const count = await this.channelRespitory
			.createQueryBuilder('channel')
			.where('channel.id = :channelId', { channelId })
			.innerJoin('channel.bannedUsers', 'users', 'users.id = :userId', { userId })
			.getCount();

		return (count > 0);
	}

	async isUserInChannel(channelId: number, userId: number): Promise<boolean> {
		const count = await this.channelRespitory
			.createQueryBuilder('channel')
			.innerJoin('channel.members', 'members', 'members.userId = :userId', { userId })
			.where('channel.id = :channelId', { channelId })
			.getCount();

		return (count > 0);
	}

	async isUserMuted(channelId: number, userId: number): Promise<boolean> {
		const count = await this.muteRespitory
			.createQueryBuilder('mute')
			.innerJoin('mute.channel', 'channel', 'channel.id = :channelId', { channelId })
			.where('mute.userId = :userId', { userId })
			.getCount();

		return (count > 0);
	}

	async getChannelById(channelId: number, requestedRelations?: string[]): Promise<Channel> {
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

	async getPublicChannels(channelType: ChannelType): Promise<Channel[]> {
		const channels = await this.channelRespitory.find({ where: { type: channelType } });
		return (channels);
	}

	async createChannel(creator: User, createChannelDto: CreateChannelDto, image: Express.Multer.File): Promise<Channel> {
		let newChannel: Channel = this.channelRespitory.create(createChannelDto);
		let newMember: ChannelMember;

		newChannel.name = newChannel.name.replace(/\s+/g, ' ').trim();
		if (!newChannel.name.length) {
			throw new BadRequestException('Name must not be empty');
		}
		try {
			newChannel = await this.channelRespitory.save(newChannel);
			newMember = await this.memberService.createMember(newChannel, creator, ChannelRoles.admin);

			if (image) {
				const { fileName } = createImage(newChannel.id, image);

				newChannel.image = fileName;
				await this.channelRespitory.save(newChannel);
		}
		} catch(error) {
			if (newChannel?.id) {
				await this.channelRespitory.delete(newChannel.id);
			}
			if (newMember?.id) {
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
		const channel = await this.getChannelById(channelId, ['members', 'bannedUsers']);
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

		const isMember = channel.members.some(member => member.userId === user.id);
		if (isMember) {
			throw new BadRequestException(`User is already in channel`);
		}
		if (channel.type === 'protected' && !(await this.verifyPassword(password, channel.password))) {
			throw new BadRequestException('Incorrect password');
		}

		return (await this.memberService.createMember(channel, user));
	}

	async removeChannel(channelId: number) {
		let channel = await this.getChannelById(channelId, ['members', 'log', 'bannedUsers', 'mutedUsers', 'invites']);
		if (!channel) {
			throw new NotFoundException('Channel not found');
		}

		try {
			if (channel.invites) {
				this.inviteService.removeInvite(channel.invites);
			}
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
			throw new NotFoundException('Mute not found');
		}

		return (await this.muteRespitory.remove(mute));
	}

	async muteMember(victimId: number, channelId: number, muteUntil: number | null): Promise<Mute> {
		const expireDate = muteUntil ? new Date(Date.now() + muteUntil * 60 * 1000) : null;
		return (await this.createMute(victimId, channelId, expireDate));
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

	async transferOwnership(admin: ChannelMember, newAdmin: ChannelMember): Promise<ChannelMember[]> {
		admin.role = ChannelRoles.moderator;
		newAdmin.role = ChannelRoles.admin;
		try {
			const members = [admin, newAdmin];
			return (await this.memberService.saveMembers(members));
		} catch (error) {
			throw new InternalServerErrorException(`Could not transfer ownership: ${error.message}`);
		}
	}

	async updateChannel(channel: Channel, updateChannelDto: UpdateChannelDto, image: Express.Multer.File) {
		if (!Object.keys(updateChannelDto).length) return (null);

		if (image) {
			let newImage: string = undefined;
			let uploadPath: string;

			try {
				const { fileName, imagePath } = createImage(channel.id, image);
				newImage = fileName;
				uploadPath = imagePath;
				await this.channelRespitory.update(channel.id, { image: newImage });
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
		return (await this.channelRespitory.update(channel.id, updateChannelDto));
	}

	async logMessage(channelId: number, author: User, message: string): Promise<Message> {
		if (!message?.length) {
			throw new BadRequestException('Empty message');
		}

		const channel = await this.getChannelById(channelId, ['members', 'mutedUsers']);
		if (!channel)
			throw new NotFoundException('Channel not found');

		const isMember = channel.members.find(member => member.userId === author.id);
		if (!isMember) {
			throw new UnauthorizedException('Unauthorized: You are not in this channel');
		}
		const isMuted = channel.mutedUsers.some((mute) => mute.userId === author.id)
		if (isMuted) {
			throw new UnauthorizedException('Unauthorized: You are muted');
		}

		return (await this.messageService.createMessage(channel, author, message));
	}
}
