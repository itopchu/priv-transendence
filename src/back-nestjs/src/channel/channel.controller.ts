import { Controller, Get, Post, Patch, Res, Req, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express'
import { Channel } from 'src/entities/channel.entity';
import { ChannelService } from './channel.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('channel')
export class ChannelController {
	constructor(private readonly channelService: ChannelService) {}

	@Get('user')
	@UseGuards(AuthGuard)
	async getUserChannels(@Req() req: Request, @Res() res: Response) {
		const user = req.authUser;
		const channels = this.channelService.getAllChannels(user);
		return (res.json(channels));
	}

	@Get('public')
	async getPublicChannels(@Res() res: Response) {
		const channels = await this.channelService.getPublicChannels();
		return (res.json(channels));
	}

	@Post('create')
	@UseGuards(AuthGuard)
	async createChannel(@Req() req: Request, @Res() res: Response) {
		const user = req.authUser;
		const { name, password } = req.body;
		let newChannel: Channel;

		try {
			newChannel = await this.channelService.createChannel(user, name, password);
		} catch(error) {
			return (res.status(500).json({
				message: 'Channel creation failed', 
				errorMessage: error.message
			}));
		}
		return (res.json(newChannel));
	}
	
	@Patch()
	async updateChannel() {
	}
}
