import { forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Invite } from "../../entities/chat.entity";
import { User } from "../../entities/user.entity";
import { Repository } from "typeorm";
import { ChannelService } from "../channel/channel.service";

@Injectable()
export class InviteService {
	constructor(
		@InjectRepository(Invite)
		private inviteRepository: Repository<Invite>,
		@Inject(forwardRef(() => ChannelService))
		private readonly channelService: ChannelService,
	) {}
	
	async getInviteById(inviteId: string, relations?: string[]) {
		try {
			const invite = await this.inviteRepository.findOne({
				where: { id: inviteId },
				relations: relations,
			});

			return (invite);
		} catch (error) {
			console.error(error.message);
			throw new InternalServerErrorException(`Could not get invite by id: ${error.message}`);
		}
	}

	async getAllInviteByChannelId(channelId: number, relations?: string[]) {
		try {
			const invite = await this.inviteRepository.find({
				where: { destinationId: channelId },
				relations: relations,
			});

			return (invite);
		} catch (error) {
			console.error(error.message);
			throw new InternalServerErrorException(`Could not get all invites by channel id: ${error.message}`);
		}
	}

	async getExpiredInvites() {
		const now = new Date();

		const expiredInvites = await this.inviteRepository.createQueryBuilder('invite')
		.where('invite.expireAt <= :now', { now })
		.getMany()

		return (expiredInvites);
	}

	async validateJoin(user: User, inviteId: string) {
		const invite = await this.getInviteById(inviteId);
		
		if (!invite) {
			throw new NotFoundException('Invite has expired or was not found');
		}
		const isBanned = await this.channelService.isUserBanned(invite.destinationId, user.id);
		if (isBanned) {
			throw new UnauthorizedException('User is banned from this channel');
		}
		return (invite);
	}

	async createInvite(userId: number, channelId: number) {
		const newInvite = this.inviteRepository.create({
			destinationId: channelId,
			creator: { id: userId } as User,
			expireAt: new Date(Date.now() + 3600 * 1000), // 60 min (3600 seconds)
		});
		return (await this.inviteRepository.save(newInvite));
	}

	async removeInvite(invites: Invite[] | Invite) {
		if (Array.isArray(invites))
			return (await this.inviteRepository.remove(invites));
		return (await this.inviteRepository.remove(invites));
	}
}
