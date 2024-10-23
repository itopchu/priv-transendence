import {
	Controller,
	Get,
	Post,
	Patch,
	Req,
	UseGuards,
	Body,
	UsePipes,
	ValidationPipe,
	InternalServerErrorException,
	Param,
	ParseIntPipe,
	NotFoundException,
	BadRequestException,
	UnauthorizedException,
	Delete,
	UseInterceptors,
	UploadedFile,
    ParseEnumPipe,
    ParseUUIDPipe
} from '@nestjs/common';
import { Request } from 'express'
import { FileInterceptor } from '@nestjs/platform-express';
import {
	ChannelPublicDTO,
	CreateChannelDto,
	InvitePublicDTO,
	MemberClientDTO,
	MemberPublicDTO,
	MessagePublicDTO,
	UpdateChannelDto,
	UpdateMemberDto
} from '../../dto/chat.dto';
import { Channel, ChannelRoles, ChannelType } from '../../entities/chat.entity';
import { ChannelService } from './channel.service';
import { AuthGuard } from '../../auth/auth.guard';
import { multerOptions } from '../../user/user.controller';
import { ChatGateway, UpdateType } from '../chat.gateway';
import { memberClientRelations, MemberService } from './member.service';
import { InviteService } from '../invite/invite.service';
import { UserPublicDTO } from '../../dto/user.dto';

@Controller('channel')
export class ChannelController {
	constructor(
		private readonly channelService: ChannelService,
		private readonly memberService: MemberService,
		private readonly chatGateway: ChatGateway,
		private readonly inviteService: InviteService,
	) {}

	@Get('messages/:id')
	@UseGuards(AuthGuard)
	async getMessageLog(@Req() req: Request, @Param('id', ParseIntPipe) channelId: number) {
		const user = req.authUser;

		const isMember = await this.channelService.isUserInChannel(channelId, user.id);
		if (!isMember) {
			throw new UnauthorizedException('Unauthorized: User not part of channel');
		}

		let channel: Channel;
		try {
			channel = await this.channelService.getChannelById(channelId, ['log', 'log.author']);
		} catch(error) {
			throw new InternalServerErrorException(`Could not retrieve messages: ${error.message}`);
		}
		if (!channel) {
			throw new NotFoundException(`Channel not found`);
		}

		const publicLog = channel.log.map(message => new MessagePublicDTO(message));
		return ({ messages: publicLog });
	}

	@Get(':channelId/banned')
	@UseGuards(AuthGuard)
	async getBannedUsers(@Req() req: Request, @Param('channelId', ParseIntPipe) channelId: number) {
		const user = req.authUser;

		const membership = await this.memberService.getMembershipByChannel(channelId, user.id, ['channel.bannedUsers']);
		if (!membership) {
			throw new NotFoundException('Membership or channel not found channel');
		}
		const isMod = membership.role <= ChannelRoles.moderator;
		if (!isMod) {
			throw new UnauthorizedException('Unauthorized: insufficient privileges');
		}

		const publicUsers = membership.channel.bannedUsers.map((bannedUser) => {
			return (new UserPublicDTO(bannedUser, null));
		});
		return ({ users: publicUsers });
	}

	@Get(':channelId/members')
	@UseGuards(AuthGuard)
	async getMembers(@Req() req: Request, @Param('channelId', ParseIntPipe) channelId: number) {
		const user = req.authUser;

		const channel = await this.channelService.getChannelById(channelId, ['members.user', 'mutedUsers']);
		if (!channel) {
			throw new NotFoundException("Channel not found");
		}
		const membership = channel.members.find((member) => member.userId === user.id);
		if (!membership) {
			throw new UnauthorizedException('User is not in channel');
		}

		const isMod = membership.role <= ChannelRoles.moderator;
		const mutedUsersIds = isMod ? new Set(channel.mutedUsers.map((mute) => mute.userId)) : undefined;

		const publicMembers = channel.members.map((member) => {
			return (new MemberPublicDTO(member, mutedUsersIds?.has(member.userId)));
		});
		return ({ members: publicMembers });
	}

	@Get('joined/:id')
	@UseGuards(AuthGuard)
	async getMembershipByChannel(@Req() req: Request, @Param('id', ParseIntPipe) channelId: number) {
		const user = req.authUser;

		const membership = await this.memberService.getMembershipByChannel(channelId, user.id, memberClientRelations);
		if (!membership) {
			throw new NotFoundException("Membership not found");
		}
		return ({ membership: new MemberClientDTO(membership, user.id) });
	}

	@Get('joined')
	@UseGuards(AuthGuard)
	async getUserChannels(@Req() req: Request) {
		const user = req.authUser;

		const memberships = await this.memberService.getMemberships(user);

		const clientMemberships = (memberships ?? []).map((membership) => new MemberClientDTO(membership, user.id));
		return ({ memberships: clientMemberships });
	}

	@Get('invite/:inviteId')
	@UseGuards(AuthGuard)
	async getInvite(
		@Req() req: Request,
		@Param('inviteId', new ParseUUIDPipe({
			exceptionFactory: () => new BadRequestException('Invalid invite id')
		})) inviteId: string,
	) {
		const user = req.authUser;
		const invite = await this.inviteService.validateJoin(user, inviteId);
		return ({ invite: new InvitePublicDTO(invite, user.id) });
	}

	@Get(':id')
	@UseGuards(AuthGuard)
	async getPublicChannelInfo(
		@Req() req: Request,
		@Param('id', new ParseIntPipe) channelId: number
	) {
		const user = req.authUser;
		const channel = await this.channelService.getChannelById(channelId, ['members', 'bannedUsers']);
		if (channel.type === ChannelType.private) {
			throw new UnauthorizedException('Unauthorized: Private channels are private... THINK');
		}

		const publicChannel = new ChannelPublicDTO(channel, user.id);
		return ({ channel: publicChannel });
	}

	@Get('type/:type')
	@UseGuards(AuthGuard)
	async getPublicChannels(@Param('type', new ParseEnumPipe(ChannelType)) channelType: ChannelType) {
		if (channelType === ChannelType.private) {
			throw new UnauthorizedException('Unauthorized: Private channels are private... THINK');
		}
		try {
			const channels = await this.channelService.getPublicChannels(channelType);

			const publicChannels = channels.map(channel => new ChannelPublicDTO(channel));
			return ({ channels: publicChannels });
		} catch (error) {
			throw new InternalServerErrorException(`Could not retrieve public channels: ${error.message}`);
		}
	}

	@Post('join/:id')
	@UseGuards(AuthGuard)
	async joinChannel(
		@Req() req: Request,
		@Param('id', ParseIntPipe) channelId: number,
		@Body('password') password?: string | null
	) {
		const user = req.authUser;

		const newMembership = await this.channelService.joinChannel(user, channelId, password);
		const newMembershipWithRel = await this.memberService.getMembershipById(newMembership.id, memberClientRelations);
		this.chatGateway.emitMemberJoined(newMembershipWithRel);
		return ({ membership: new MemberClientDTO(newMembershipWithRel, user.id) });
	}

	@Post('create')
	@UseGuards(AuthGuard)
	@UseInterceptors(FileInterceptor('image', multerOptions))
	@UsePipes(new ValidationPipe({ whitelist: true }))
	async createChannel(@Req() req: Request, @UploadedFile() image: Express.Multer.File, @Body() createChannelDto: CreateChannelDto) {
		const user = req.authUser;

		if (createChannelDto.type === ChannelType.protected) {
			if (!createChannelDto.password) {
				throw new BadRequestException('No password provided');
			}
			createChannelDto.password = await this.channelService.hashPassword(createChannelDto.password);
		}

		try {
			const newChannel = await this.channelService.createChannel(user, createChannelDto, image);
			if (newChannel.type !== ChannelType.private) {
				const publicChannel = new ChannelPublicDTO(newChannel);
				this.chatGateway.emitChannelUpdate('public', publicChannel, UpdateType.created);
			}
			const newMembership = await this.memberService.getMembershipByChannel(newChannel.id, user.id, memberClientRelations);
			const clientMembership = new MemberClientDTO(newMembership, user.id);
			this.chatGateway.emitToUserUpdate('membership', user.id, clientMembership, UpdateType.created);
			return ({ membership: clientMembership });
		} catch(error) {
			throw new InternalServerErrorException(`Channel creation failed: ${error.message}`);
		}
	}
	
	@Post('invite/:destinationId')
	@UseGuards(AuthGuard)
	async createInvite(
		@Req() req: Request,
		@Param('destinationId', ParseIntPipe) destinationId: number,
	) {
		const user = req.authUser;
		const membership = await this.memberService.getMembershipByChannel(destinationId, user.id, ['channel']);
		if (!membership ) {
			throw new UnauthorizedException('Unauthorized: Channel does not exist or user is not in channel');
		}
		if (membership.channel.type !== ChannelType.public && membership.role > ChannelRoles.moderator) {
			throw new UnauthorizedException('Unauthorized: Insufficient privileges');
		}

		const invite = await this.inviteService.createInvite(user.id, destinationId);
		return ({ inviteId: invite.id });
	}

	@Patch('invite/:inviteId')
	@UseGuards(AuthGuard)
	async acceptInvite(
		@Req() req: Request,
		@Param('inviteId',  new ParseUUIDPipe()) inviteId: string,
	) {
		const user = req.authUser;
		const invite = await this.inviteService.validateJoin(user, inviteId);
		const userIsInChannel = invite.destination.members.some((member) => member.userId === user.id);
		if (userIsInChannel) {
			throw new BadRequestException('You are already in this channel');
		}

		const newMembership = await this.memberService.createMember(invite.destination, user);
		const newMembershipWithRel = await this.memberService.getMembershipById(newMembership.id, memberClientRelations);
		this.chatGateway.emitMemberJoined(newMembershipWithRel);
		return ({ membership: new MemberClientDTO(newMembershipWithRel, user.id) });
	}

	@Patch('kick/:id')
	@UseGuards(AuthGuard)
	async kickUser(
		@Req() req: Request,
		@Param('id', ParseIntPipe) channelId: number,
		@Body('victimId', ParseIntPipe) victimId: number
	) {
		const user = req.authUser;
		if (user.id === victimId) {
			throw new BadRequestException('Kicking yourself.. Really?');
		}

		const channel = await this.channelService.getChannelById(channelId, ['members']);
		if (!channel)
			throw new  NotFoundException('Channel not found');
		const kickerMembership = channel.members.find((member) => member.userId === user.id);
		if (!kickerMembership)
			throw new NotFoundException('User or membership not found');
		const victimMembership = channel.members.find((member) => member.userId === victimId);
		if (!victimMembership)
			throw new NotFoundException('Victim membership not found');

		if (kickerMembership.role > victimMembership.role)
			throw new UnauthorizedException('Unauthorized user')
		await this.memberService.deleteMember(victimMembership.id);
		this.chatGateway.emitMemberLeft(
			victimMembership.userId,
			victimMembership.id, 
			channel.id,
			channel.members.length - 1
		);
	}

	@Patch('mute/:id')
	@UseGuards(AuthGuard)
	async muteMember(@Req() req: Request,
		@Param('id', ParseIntPipe) channelId: number,
		@Body('victimId', ParseIntPipe) victimId: number,
		@Body('muteUntil') muteUntil: string | null
	) {
		const duration = muteUntil ? parseInt(muteUntil, 10) : null;

		const user = req.authUser;
		if (user.id === victimId) {
			throw new BadRequestException("Muting yourself..? Just shut up...");
		}

		const channel = await this.channelService.getChannelById(channelId, ['members', 'mutedUsers']);
		const muterMembership = channel.members.find((member) => member.userId === user.id);
		if (!muterMembership) {
			throw new NotFoundException('User or Channel not found');
		}
		const victimMembership = channel.members.find((member) => member.userId === victimId); 
		if (!victimMembership) {
			throw new NotFoundException('Victim not found');
		}

		if (muterMembership.role > victimMembership.role) {
			throw new UnauthorizedException('Unauthorized: Insufficient privileges')
		}

		const isMuted = channel.mutedUsers.some((mute) => mute.userId === victimId);
		if (isMuted) {
			await this.channelService.removeMute(victimId, channelId);
		} else {
			await this.channelService.muteMember(victimId, channelId, duration);
		}
		const emitUpdateDTO = { id: victimMembership.id, isMuted: !isMuted };
		this.chatGateway.emitMemberUpdate(channelId, emitUpdateDTO, UpdateType.updated);
		this.chatGateway.emitToUserUpdate('membership', victimId, emitUpdateDTO, UpdateType.updated);
	}

	@Patch('ban/:id')
	@UseGuards(AuthGuard)
	async banUser(
		@Req() req: Request,
		@Param('id', ParseIntPipe) channelId: number,
		@Body('victimId', ParseIntPipe) victimId: number
	) {
		const user = req.authUser;
		if (user.id === victimId) {
			throw new BadRequestException("Banning yourself..? Now that's going to far");
		}

		const channel = await this.channelService.getChannelById(channelId, ['members.user', 'bannedUsers']);
		if (!channel) {
			throw new NotFoundException('Channel not found');
		}
		const userMembership = channel.members.find((membership) => membership.userId === user.id)
		if (!userMembership) {
			throw new NotFoundException('User not found');
		}

		const isBanned = channel.bannedUsers.some((bannedUser) => bannedUser.id === victimId)
		if (isBanned) {
			if (userMembership.role >= ChannelRoles.moderator) {
				throw new UnauthorizedException('Unauthorized: Insufficient privileges');
			}
			await this.channelService.unbanUser(victimId, channel);
			this.chatGateway.emitBanListUpdate(channelId, { id: victimId }, UpdateType.deleted);
		} else {
			const victimMembership = channel.members.find((membership) => membership.userId === victimId)
			if (!victimMembership) {
				throw new NotFoundException('Victim not found');
			}

			if (userMembership.role >= victimMembership.role) {
				throw new UnauthorizedException('Unauthorized: Insufficient privileges');
			}

			const memberToDelete = { ...victimMembership }
			await this.channelService.banUser(memberToDelete, channel);
			this.chatGateway.emitBanListUpdate(channelId, new UserPublicDTO(victimMembership.user, null), UpdateType.created);
			this.chatGateway.emitMemberLeft(
				victimMembership.userId,
				victimMembership.id, 
				channel.id,
				channel.members.length - 1
			);
		}
	}

	@Patch('transfer/:id')
	@UseGuards(AuthGuard)
	async transferOwnership(
		@Req() req: Request,
		@Param('id', ParseIntPipe) channelId: number,
		@Body('victimId', ParseIntPipe) receiverId: number)
	{
		const user = req.authUser;
		if (user.id === receiverId) {
			throw new BadRequestException("You are already THE admin FOOL");
		}

		const admin = await this.memberService.getMembershipByChannel(channelId, user.id, ['channel.members']);
		if (!admin) {
			throw new NotFoundException('Membership not found');
		}
		const newAdmin = admin.channel.members.find((member) =>
			member.userId === receiverId
		); 
		if (!newAdmin) {
			throw new NotFoundException('Receiver membership not found');
		}

		if (admin.role !== ChannelRoles.admin) {
			throw new UnauthorizedException('Unauthorized: User is not an admin');
		}

		const updatedMembers = await this.channelService.transferOwnership(admin, newAdmin);
		updatedMembers.forEach((member) => {
			const userId = member.id === admin.id ? user.id : newAdmin.userId;
			const emitDTO = {
				id: member.id,
				role: member.role
			}
			this.chatGateway.emitMemberUpdate(channelId, emitDTO, UpdateType.updated);
			this.chatGateway.emitToUserUpdate('membership', userId, emitDTO, UpdateType.updated);
		});
	}

	@Patch(':id')
	@UseGuards(AuthGuard)
	@UsePipes(new ValidationPipe({ whitelist:  true }))
	@UseInterceptors(FileInterceptor('image', multerOptions))
	async updateChannel(
		@Req() req: Request,
		@UploadedFile() image: Express.Multer.File,
		@Param('id', ParseIntPipe) channelId: number,
		@Body() updateChannelDto: UpdateChannelDto,
	) {
		if (!Object.keys(updateChannelDto).length && !image) {
			return;
		}

		const user = req.authUser;
		const membership = await this.memberService.getMembershipByChannel(channelId, user.id, ['channel']);
		if (!membership) {
			throw new UnauthorizedException('Membership not found');
		}

		const isMod = membership.role < ChannelRoles.member;
		const isAdmin = membership.role === ChannelRoles.admin;
		if (!isMod || ((updateChannelDto.type || updateChannelDto.password) && !isAdmin)) {
			throw new UnauthorizedException('Unauthorized: User lacks privileges');
		}

		if (updateChannelDto.name) {
			updateChannelDto.name = updateChannelDto?.name.replace(/\s+/g, ' ').trim();
			if (!updateChannelDto.name.length) {
				throw new BadRequestException('Channel name must not be empty');
			}
		}

		if (updateChannelDto.description) {
			updateChannelDto.description = updateChannelDto?.description.trim();
			if (!updateChannelDto.description.length) {
				throw new BadRequestException('Channel description must not be empty');
			}
		}

		if (updateChannelDto.password
				|| (updateChannelDto.type && updateChannelDto.type === ChannelType.protected)) {
			if (!updateChannelDto.password) {
				throw new BadRequestException('Password required');
			}
			updateChannelDto.password = await this.channelService.hashPassword(updateChannelDto.password);
		}

		await this.channelService.updateChannel(membership.channel, updateChannelDto, image);
		const updatedChannel = await this.channelService.getChannelById(channelId);
		const publicChannel: ChannelPublicDTO = new ChannelPublicDTO(updatedChannel);

		let publicUpdateType: UpdateType = null;
		if (updatedChannel.type !== ChannelType.private) {
			publicUpdateType = membership.channel.type === ChannelType.private
				? UpdateType.created
				: UpdateType.updated
		} else if (membership.channel.type !== ChannelType.private) {
			publicUpdateType = UpdateType.deleted;
		}

		if (publicUpdateType) {
			this.chatGateway.emitChannelUpdate('public', publicChannel, publicUpdateType);
		}
		this.chatGateway.emitChannelUpdate('client', publicChannel, UpdateType.updated);
	}

	@Patch('member/:id')
	@UseGuards(AuthGuard)
	@UsePipes(new ValidationPipe({ whitelist: true }))
	async updateMember(
		@Req() req: Request,
		@Param('id', ParseIntPipe) memberId: number,
		@Body() updateMemberDto: UpdateMemberDto
	) {
		const user = req.authUser;
		if (!Object.keys(updateMemberDto).length) {
			return;
		}

		const member = await this.memberService.getMembershipById(memberId, ['channel.members', 'user']);
		if (!member) {
			throw new NotFoundException('Member not found');
		}
		if (updateMemberDto.role === ChannelRoles.admin)  {
			throw new BadRequestException('Unable to promote to admin');
		}

		const userMembership = member.channel.members.find((membership) => membership.userId === user.id); 
		if (!userMembership) {
			throw new UnauthorizedException('Unauthorized: Membership not found');
		}
		if (userMembership.id === member.id) {
			throw new BadRequestException('User changing its own membership, Stop messing around!');
		}
		if (userMembership.role > member.role) {
			throw new UnauthorizedException('Unauthorized: Insufficient privileges');
		}
		
		const result = await this.memberService.updateMember(member.id, updateMemberDto);
		if (result.affected > 0) {
			const emitDTO = { id: member.id, ...updateMemberDto };
			this.chatGateway.emitMemberUpdate(member.channel.id, emitDTO, UpdateType.updated);
			this.chatGateway.emitToUserUpdate('membership', member.userId, emitDTO, UpdateType.updated);
		}
	}
	
	@Delete(':id')
	@UseGuards(AuthGuard)
	async deleteChannel(@Req() req: Request, @Param('id', ParseIntPipe) channelId: number) {
		const user = req.authUser;
		const channel = await this.channelService.getChannelById(channelId, ['members']);
		if (!channel) {
			throw new NotFoundException('Channel not found');
		}
		
		const membership = channel.members.find((member) => member.userId === user.id);
		if (!membership || membership.role !== ChannelRoles.admin) {
			throw new UnauthorizedException('Unauthorized: Membership not found or insufficient privileges');
		} 

		const deletedChannel = await this.channelService.removeChannel(channelId);
		if (deletedChannel.type !== ChannelType.protected) {
			this.chatGateway.emitChannelUpdate('public', { id: channelId }, UpdateType.deleted);
		}
		this.chatGateway.emitChannelDeleted(channelId);
	}
	
	@Delete('leave/:id')
	@UseGuards(AuthGuard)
	async leaveChannel(@Req() req: Request, @Param('id', ParseIntPipe) membershipId: number) {
		const user = req.authUser;
		const membership = await this.memberService.getMembershipById(membershipId, ['channel.members.user']);
		if (!membership) {
			throw new NotFoundException('Member not found');
		}

		if (membership.role === ChannelRoles.admin) {
			const channel = membership.channel;
			if (channel.members.length === 1) {
				await this.channelService.removeChannel(channel.id);
				if (channel.type !== ChannelType.private) {
					this.chatGateway.emitChannelUpdate('public', { id: membership.channel.id }, UpdateType.deleted);
				}
				this.chatGateway.emitChannelDeleted(membership.channel.id);
			} else {
				let candidate = channel.members.find((member) => member.role === ChannelRoles.moderator);
				if (!candidate) {
					candidate = channel.members[1];
				}
				await this.memberService.updateMember(candidate.id, { role: ChannelRoles.admin });
				const emitDTO = { id: candidate.id, role: ChannelRoles.admin };
				this.chatGateway.emitMemberUpdate(channel.id, emitDTO, UpdateType.updated);
				this.chatGateway.emitToUserUpdate('membership', candidate.user.id, emitDTO, UpdateType.updated);
			}
		}
		await this.memberService.deleteMember(membership.id);
		this.chatGateway.emitMemberLeft(
			user.id,
			membership.id, 
			membership.channel.id,
			membership.channel.members.length - 1
		);
	}
}
