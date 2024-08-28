import { Controller, Get, Post, Patch, Res, Req, UseGuards, Body, UsePipes, ValidationPipe, InternalServerErrorException, Param, ParseIntPipe, NotFoundException, ForbiddenException, BadRequestException, UnauthorizedException, Delete } from '@nestjs/common';
import { Request, Response } from 'express'
import { Channel, ChannelMember, ChannelRoles } from 'src/entities/channel.entity';
import { ChannelService } from './channel.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateChannelDto } from '../dto/createChannel.dto';
import { UpdateChannelMemberDto } from 'src/dto/channel.dto';
import { waitForDebugger } from 'inspector';

@Controller('channel')
export class ChannelController {
	constructor(private readonly channelService: ChannelService) {}

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

	@Post('join')
	@UseGuards(AuthGuard)
	async joinChannel(@Req() req: Request, @Body('channelId', ParseIntPipe) channelId: number, @Body() password?: string | null) {
		const user = req.authUser;

		return (await this.channelService.joinChannel(user, channelId, password));
	}

	@Post('create')
	@UseGuards(AuthGuard)
	@UsePipes(new ValidationPipe({ whitelist: true }))
	async createChannel(@Req() req: Request, @Body() createChannelDto: CreateChannelDto) {
		const user = req.authUser;

		try {
			const newChannel = await this.channelService.createChannel(user, createChannelDto);
			return ({ channel: newChannel });
		} catch(error) {
			console.error('Error creating channel:', error);
			throw new InternalServerErrorException(`Channel creation failed: ${error.message}`);
		}
	}

	@Delete('kick')
	@UseGuards(AuthGuard)
	async kickUser(@Req() req: Request, @Body('kickeeId', ParseIntPipe) kickeeId: number, @Body('channelId', ParseIntPipe) channelId: number) {
		const user = req.authUser;
		if (user.id === kickeeId) {
			throw new BadRequestException('Kicking yourself.., realy?');
		}

		return (await this.channelService.kickMember(user, kickeeId, channelId));
	}

	@Delete('ban')
	@UseGuards(AuthGuard)
	async banUser(@Req() req: Request, @Body('baneeId', ParseIntPipe) baneeId: number, @Body('channelId', ParseIntPipe) channelId: number) {
		const user = req.authUser;
		if (user.id === baneeId) {
			throw new BadRequestException('Banning yourself.., realy?');
		}

		return (this.channelService.banUser(user, baneeId, channelId));
	}

	@Delete('leave')
	@UseGuards(AuthGuard)
	async leaveChannel(@Req() req: Request, @Body('channelId', ParseIntPipe) memberId: number) {
		const user = req.authUser;

		const memberships = await this.channelService.getMemberships(user);
		const hasMembership = memberships.some((membership) => membership.id == memberId);
		if (!hasMembership) {
			throw new BadRequestException('Membership not found');
		}

		return (await this.channelService.deleteMember(memberId));
	}

	@Patch('update/membership')
	@UseGuards(AuthGuard)
	@UsePipes(new ValidationPipe({ whitelist: true }))
	async updateMember(
		@Req() req: Request,
		@Body('memberId', ParseIntPipe) memberId: number,
		@Body() UpdateChannelMemberDto: UpdateChannelMemberDto
	) {
		const user = req.authUser;

		return (await this.channelService.updateMember(user, memberId, UpdateChannelMemberDto));
	}
}
