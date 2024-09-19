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
	UploadedFile
} from '@nestjs/common';
import { Request } from 'express'
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ChannelClientDTO,
	ChannelPublicDTO,
	CreateChannelDto,
	MemberClientDTO,
	MemberPublicDTO,
	MessagePublicDTO,
	UpdateChannelDto,
	UpdateMemberDto
} from '../../dto/channel.dto';
import { Channel, ChannelRoles, ChannelType } from '../../entities/channel.entity';
import { ChannelService } from './channel.service';
import { AuthGuard } from '../../auth/auth.guard';
import { multerOptions } from '../../user/user.controller';
import { ChatGateway, UpdateType } from '../chat.gateway';
import { MemberService } from './member.service';

@Controller('channel')
export class ChannelController {
	constructor(
		private readonly channelService: ChannelService,
		private readonly memberService: MemberService,
		private readonly channelGateway: ChatGateway
	) {}

	@Get('messages/:id')
	@UseGuards(AuthGuard)
	async getMessageLog(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
		const user = req.authUser;
		let channel: Channel;

		try {
			channel = await this.channelService.getChannelById(id, ['log', 'log.author', 'members.user']);
		} catch(error) {
			throw new InternalServerErrorException(`Could not retrieve messages: ${error.message}`);
		}
		if (!channel) {
			throw new NotFoundException(`Channel not found`);
		}

		const isMember = channel.members.some(member => member.user.id === user.id);
		if (!isMember) {
			throw new UnauthorizedException('Unauthorized: User not part of channel');
		}

		const publicLog = channel.log.map(message => new MessagePublicDTO(message));
		return ({ messages: publicLog });
	}

	@Get('joined/:id')
	@UseGuards(AuthGuard)
	async getMembership(@Req() req: Request, @Param('id', ParseIntPipe) membershipId: number) {
		const user = req.authUser;

		const membership = await this.memberService.getMembershipById(membershipId);
		if (!membership) {
			throw new NotFoundException("Membership not found");
		}
		if (membership.user.id !== user.id) {
			throw new UnauthorizedException("Unauthorized: Not user's membership");
		}

		return ({ membership: new MemberClientDTO(membership) });
	}

	@Get('joined')
	@UseGuards(AuthGuard)
	async getUserChannels(@Req() req: Request) {
		const user = req.authUser;

		const memberships = await this.memberService.getMemberships(user);

		const clientMemberships = (memberships ?? []).map(membership => new MemberClientDTO(membership));
		return ({ memberships: clientMemberships });
	}

	@Get('public')
	async getPublicChannels() {
		try {
			const channels = await this.channelService.getPublicChannels();

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

		const newMember = await this.channelService.joinChannel(user, channelId, password);
		this.channelGateway.emitMemberUpdate(channelId, new MemberPublicDTO(newMember), UpdateType.updated);
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
			const publicChannel = new ChannelPublicDTO(newChannel);

			if (newChannel.type !== ChannelType.private) {
				this.channelGateway.emitPublicChannelUpdate(publicChannel, UpdateType.updated);
			}
			return ({ channel: publicChannel });
		} catch(error) {
			throw new InternalServerErrorException(`Channel creation failed: ${error.message}`);
		}
	}

	@Patch('kick/:id')
	@UseGuards(AuthGuard)
	async kickUser(@Req() req: Request, @Param('id', ParseIntPipe) channelId: number, @Body('victimId', ParseIntPipe) victimId: number) {
		const user = req.authUser;
		if (user.id === victimId) {
			throw new BadRequestException('Kicking yourself.. Really?');
		}

		const kickedMember = await this.channelService.kickMember(user, victimId, channelId);
		if (!Array.isArray(kickedMember)) {
			this.channelGateway.emitMemberLeft(victimId, new MemberPublicDTO(kickedMember), channelId);
		}
	}

	@Patch('mute/:id')
	@UseGuards(AuthGuard)
	async muteMember(@Req() req: Request,
		@Param('id', ParseIntPipe) channelId: number,
		@Body('victimId', ParseIntPipe) victimId: number,
		@Body('muteUntil') muteUntil: string | null
	) {
		const duration = muteUntil ?  parseInt(muteUntil, 10) : null;

		const user = req.authUser;
		if (user.id === victimId) {
			throw new BadRequestException("Muting yourself..? Just shut up...");
		}

		await this.channelService.muteMember(user, victimId, duration, channelId);
		const mutedMember = await this.memberService.getMembershipByChannel(channelId, victimId);
		this.channelGateway.emitMemberUpdate(channelId, new MemberPublicDTO(mutedMember), UpdateType.updated);
	}

	@Patch('ban/:id')
	@UseGuards(AuthGuard)
	async banUser(@Req() req: Request, @Param('id', ParseIntPipe) channelId: number, @Body('victimId', ParseIntPipe) victimId: number) {
		const user = req.authUser;
		if (user.id === victimId) {
			throw new BadRequestException("Banning yourself..? Now that's going to far");
		}

		const member = await this.channelService.banUser(user, victimId, channelId);
		if (!Array.isArray(member)) {
			this.channelGateway.emitMemberLeft(victimId, new MemberPublicDTO(member), channelId);
		}
	}

	@Patch('transfer/:id')
	@UseGuards(AuthGuard)
	async transferOwnership(
		@Req() req: Request,
		@Param('id', ParseIntPipe) channelId: number,
		@Body('victimId', ParseIntPipe) victimId: number)
	{
		const user = req.authUser;
		if (user.id === victimId) {
			throw new BadRequestException("You are already THE admin FOOL");
		}

		const members = await this.channelService.transferOwnership(user, victimId, channelId);
		const publicMembers = members.map((member) => new MemberPublicDTO(member));
		this.channelGateway.emitMemberUpdate(channelId, publicMembers[0], UpdateType.updated);
		this.channelGateway.emitMemberUpdate(channelId, publicMembers[1], UpdateType.updated);
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
		const user = req.authUser;

		if (!Object.keys(updateChannelDto).length) {
			return;
		}

		if (updateChannelDto.type && updateChannelDto.type === 'protected') {
			if (!updateChannelDto.password) {
				throw new BadRequestException('Password required');
			}
			updateChannelDto.password = await this.channelService.hashPassword(updateChannelDto.password);
		}

		await this.channelService.updateChannel(user, channelId, updateChannelDto, image);
		const updatedChannel = await this.channelService
			.getChannelById(channelId, ['members', 'members.user', 'bannedUsers', 'mutedUsers']);

		if (updatedChannel.type !== ChannelType.private
			|| updateChannelDto.type && updateChannelDto.type !== ChannelType.private)
		{
			this.channelGateway.emitPublicChannelUpdate(new ChannelPublicDTO(updatedChannel), UpdateType.updated);
		}
		this.channelGateway.emitMemberUpdate(channelId, new ChannelClientDTO(updatedChannel), UpdateType.updated);
	}

	@Patch('/member/:id')
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
		const member = await this.memberService.getMembershipById(memberId);
		if (!member) {
			throw new NotFoundException('Member not found');
		}
		if (updateMemberDto.role === ChannelRoles.admin)  {
			throw new BadRequestException('Unable to promote to admin');
		}
		
		await this.memberService.updateMember(user, member, updateMemberDto);
		const updatedMember = await this.memberService.getMembershipById(memberId);
		this.channelGateway.emitMemberUpdate(member.channel.id, new MemberPublicDTO(updatedMember), UpdateType.updated);
	}
	
	@Delete(':id')
	@UseGuards(AuthGuard)
	async deleteChannel(@Req() req: Request, @Param('id', ParseIntPipe) channelId: number) {
		const user = req.authUser;
		const channel = await this.channelService.getChannelById(channelId, ['members', 'members.user']);
		if (!channel) {
			throw new NotFoundException('Channel not found');
		}
		
		const membership = channel.members.find((member) => member.user.id === user.id);
		if (!membership || membership.role !== ChannelRoles.admin) {
			throw new UnauthorizedException('Unauthorized: Membership not found or insufficient privileges');
		} 

		const deletedChannel = await this.channelService.removeChannel(channelId);
		if (deletedChannel.type !== ChannelType.protected) {
			this.channelGateway.emitPublicChannelUpdate({ id: channelId } as ChannelPublicDTO, UpdateType.deleted);
		}
		this.channelGateway.emitChannelDeleted(channelId);
	}
	
	@Delete('leave/:id')
	@UseGuards(AuthGuard)
	async leaveChannel(@Req() req: Request, @Param('id', ParseIntPipe) membershipId: number) {
		const user = req.authUser;

		const membership = await this.memberService.getMembershipById(membershipId);
		if (!membership) {
			throw new NotFoundException('Member not found');
		}

		const leftChannel = await this.channelService.leaveChannel(user, membership); 
		if ('type' in leftChannel) {
			if (leftChannel.type !== ChannelType.private) {
				this.channelGateway.emitPublicChannelUpdate({ id: membership.channel.id } as ChannelPublicDTO, UpdateType.deleted);
			}
			this.channelGateway.emitChannelDeleted(membership.channel.id);
		} else {
			this.channelGateway.emitMemberLeft(user.id, new MemberPublicDTO(membership), membership.channel.id);
		}
		return (leftChannel);
	}
}
