import { Controller, Get, Post, Patch, Res, Req, UseGuards, Body, UsePipes, ValidationPipe, InternalServerErrorException, Param, ParseIntPipe, NotFoundException, ForbiddenException, BadRequestException, UnauthorizedException, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Request, Response } from 'express'
import { Channel, ChannelMember, ChannelRoles, ChannelType } from '../entities/channel.entity';
import { ChannelService } from './channel.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateChannelDto, UpdateChannelDto, UpdateMemberDto } from '../dto/channel.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../user/user.controller';
import { ChannelGateway } from './channel.gateway';

@Controller('channel')
export class ChannelController {
	constructor(
		private readonly channelService: ChannelService,
		private readonly channelGateway: ChannelGateway
	) {}

	@Get('messages/:id')
	@UseGuards(AuthGuard)
	async getMessageLog(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
		const user = req.authUser;
		let channel: Channel;

		try {
			channel = await this.channelService.getChannelById(id, ['log', 'log.author', 'members.user']);
		} catch(error) {
			throw new InternalServerErrorException(`Could not retrieve messages, error: ${error.message}`);
		}
		if (!channel) {
			throw new NotFoundException(`Channel with ID ${id} not found`);
		}

		const isMember = channel.members.some(member => member.user.id === user.id);
		if (!isMember) {
			throw new ForbiddenException('Unauthirized user');
		}

		return ({ messages: channel.log });
	}

	@Get('joined')
	@UseGuards(AuthGuard)
	async getUserChannels(@Req() req: Request) {
		const user = req.authUser;

		const memberships = await this.channelService.getMemberships(user);
		return ({ memberships: memberships });
	}

	@Get('public')
	async getPublicChannels() {
		try {
			const channels = await this.channelService.getPublicChannels();
			return ({ channels: channels });
		} catch(error) {
			throw new InternalServerErrorException(error.message);
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

		const response = await this.channelService.joinChannel(user, channelId, password);
		this.channelGateway.emitChannelUpdate(channelId);
		return (response);
	}

	@Post('create')
	@UseGuards(AuthGuard)
	@UseInterceptors(FileInterceptor('image', multerOptions))
	@UsePipes(new ValidationPipe({ whitelist: true }))
	async createChannel(@Req() req: Request, @UploadedFile() image: Express.Multer.File, @Body() createChannelDto: CreateChannelDto) {
		const user = req.authUser;

		if (createChannelDto.type === ChannelType.protected  && !createChannelDto.password) {
			throw new BadRequestException('No password provided');
		}
		try {
			const newChannel = await this.channelService.createChannel(user, createChannelDto, image);
			if (newChannel.type !== ChannelType.private) {
				this.channelGateway.emitPublicChannelUpdate(newChannel);
			}
			return ({ channel: newChannel });
		} catch(error) {
			console.error('Error creating channel:', error);
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
		this.channelGateway.emitMemberLeft(victimId, channelId);
		return (kickedMember);
	}

	@Patch('mute/:id')
	@UseGuards(AuthGuard)
	async muteMember(@Req() req: Request,
		@Param('id', ParseIntPipe) channelId: number,
		@Body('victimId', ParseIntPipe) victimId: number
	) {
		const user = req.authUser;
		if (user.id === victimId) {
			throw new BadRequestException("Muting yourself..? Just shut up...");
		}

		const result = await this.channelService.muteMember(user, victimId, channelId);
		this.channelGateway.emitChannelUpdate(channelId);
		return (result);
	}

	@Patch('ban/:id')
	@UseGuards(AuthGuard)
	async banUser(@Req() req: Request, @Param('id', ParseIntPipe) channelId: number, @Body('victimId', ParseIntPipe) victimId: number) {
		const user = req.authUser;
		if (user.id === victimId) {
			throw new BadRequestException("Banning yourself..? Now that's going to far");
		}

		const bannedMember = await this.channelService.banUser(user, victimId, channelId);
		this.channelGateway.emitMemberLeft(victimId, channelId);
		return (bannedMember);
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
		this.channelGateway.emitChannelUpdate(channelId);
		return (members);
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
		if (updateChannelDto.type && updateChannelDto.type === 'protected' && !updateChannelDto.password) {
			throw new BadRequestException('Password required');
		}

		const result = await this.channelService.updateChannel(user, channelId, updateChannelDto, image);
		const updatedChannel = await this.channelService.getChannelById(channelId, ['members', 'members.user', 'banList']);
		if (updateChannelDto.type && updateChannelDto.type !== ChannelType.private) {
			this.channelGateway.emitPublicChannelUpdate(updatedChannel);
		}
		this.channelGateway.emitChannelUpdate(channelId);
		return (result);
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
		const member = await this.channelService.getMembershipById(memberId);
		if (!member) {
			throw new NotFoundException('Member not found');
		}
		if (updateMemberDto.role === ChannelRoles.admin)  {
			throw new BadRequestException('Unable to promote to admin');
		}
		
		const result = await this.channelService.updateMember(user, member, updateMemberDto);
		this.channelGateway.emitChannelUpdate(member.channel.id);
		return (result);
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
		this.channelGateway.emitChannelDeleted(channelId);
		return (deletedChannel);
	}
	
	@Delete('leave/:id')
	@UseGuards(AuthGuard)
	async leaveChannel(@Req() req: Request, @Param('id', ParseIntPipe) membershipId: number) {
		const user = req.authUser;

		const membership = await this.channelService.getMembershipById(membershipId);
		if (!membership) {
			throw new NotFoundException('Member not found');
		}

		const leftChannel = await this.channelService.leaveChannel(user, membership); 
		this.channelGateway.emitMemberLeft(user.id, membership.channel.id);
		return (leftChannel);
	}
}
