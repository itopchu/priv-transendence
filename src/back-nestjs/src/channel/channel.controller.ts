import { Controller, Get, Post, Patch, Res, Req, UseGuards, Body, UsePipes, ValidationPipe, InternalServerErrorException } from '@nestjs/common';
import { Request, Response } from 'express'
import { Channel, ChannelMember } from 'src/entities/channel.entity';
import { ChannelService } from './channel.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateChannelDto } from '../dto/createChannel.dto';

@Controller('channel')
export class ChannelController {
	constructor(private readonly channelService: ChannelService) {}

	@Get('joined')
	@UseGuards(AuthGuard)
	async getUserChannels(@Req() req: Request) {
		const user = req.authUser;
		let channels: ChannelMember[] = await this.channelService.getJoinedChannels(user);
		return (channels);
	}

	@Get('public')
	async getPublicChannels(@Res() res: Response) {
		const channels = await this.channelService.getPublicChannels();
		return (res.json(channels));
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
			return (newChannel);
		} catch(error) {
			console.error('Error creating channel:', error);
			throw new InternalServerErrorException('Channel creation failed');
		}
	}
	
	@Patch()
	async updateChannel() {
	}
}
