import { Controller, Get, Post, Patch, Res, Req, UseGuards, Body, UsePipes, ValidationPipe, InternalServerErrorException, Param, ParseIntPipe, NotFoundException, ForbiddenException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express'
import { Channel, ChannelMember } from 'src/entities/channel.entity';
import { ChannelService } from './channel.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateChannelDto } from '../dto/createChannel.dto';

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

		const channels = await this.channelService.getJoinedChannels(user);
		return ({ memberships: channels });
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
		let channel: Channel;

		try {
			channel = await this.channelService.getChannelById(channelId, ['members.user']);
		} catch(error) {
			throw new InternalServerErrorException(error.message);
		}
		if (!channel)
			throw new NotFoundException(`channel id ${channelId} not found`);

		if (channel.type === 'private')
			throw new UnauthorizedException('This channel is private');
		const isMember = channel.members.some(member => member.user.id === user.id);
		if (isMember)
			throw new BadRequestException(`User is already in channel`);
		if (channel.type === 'protected' && password !== channel.password)
			throw new BadRequestException('Wrong password');

		try {
			return (await this.channelService.addChannelMember(channel, user));
		} catch(error) {
			throw new InternalServerErrorException(error.message);
		}
	}

	@Post('create')
	@UseGuards(AuthGuard)
	@UsePipes(new ValidationPipe({ whitelist: true }))
	async createChannel(
		@Req() req: Request,
		@Body() createChannelDto: CreateChannelDto
	) {
		const user = req.authUser;

		try {
			const newChannel = await this.channelService.createChannel(user, createChannelDto);
			return ({ channel: newChannel });
		} catch(error) {
			console.error('Error creating channel:', error);
			throw new InternalServerErrorException(`Channel creation failed: ${error.message}`);
		}
	}

	@Patch()
	async updateChannel() {
	}
}
