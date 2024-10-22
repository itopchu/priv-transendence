import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UpdateMemberDto } from "../../dto/chat.dto";
import { ChannelMember, Channel, ChannelRoles } from "../../entities/chat.entity";
import { User } from "../../entities/user.entity";
import { Repository } from "typeorm";

export const memberClientRelations = [ 'user', 'channel.mutedUsers', 'channel.members' ];


@Injectable()
export class MemberService {
	constructor(
		@InjectRepository(ChannelMember)
		private memberRespitory: Repository<ChannelMember>,
	) {}

	async getMembershipById(member: number | ChannelMember, requestedRelations?: string[]): Promise<ChannelMember> {
		const membership = await this.memberRespitory.findOne({
			where: { id: typeof member === 'number' ?  member : member.id },
			relations: requestedRelations,
		})

		return (membership);
	}

	async getMembershipByChannel(channelId: number, userId: number, requestedRelations?: string[]): Promise<ChannelMember> {
		const membership = await this.memberRespitory.findOne({
			where: {
				user: { id: userId },
				channel: { id: channelId },
			},
			relations: requestedRelations,
		})

		return (membership);
	}

	async getMemberships(user: User): Promise<ChannelMember[] | null> {
		const userMemberships = await this.memberRespitory.createQueryBuilder('membership')
		.leftJoinAndSelect('membership.user', 'user')
		.where('user.id = :id', { id: user.id })
		.leftJoinAndSelect('membership.channel', 'channel')
		.leftJoinAndSelect('channel.members', 'members')
		.leftJoinAndSelect('channel.mutedUsers', 'mute')
		.getMany();
		
		return (userMemberships);
	}

	async createMember(channel: Channel, user: User, role?: ChannelRoles): Promise<ChannelMember> {
		const newMember = this.memberRespitory.create({
			role: role,
			user: user,
			userId: user.id,
			channel: channel,
		})
		try {
			return (await this.memberRespitory.save(newMember));
		} catch(error) {
			throw new InternalServerErrorException('Failed to create new channel member');
		}
	}

	async updateMember(memberId: number, updateMemberDto: UpdateMemberDto) {
		try {
			return (await this.memberRespitory.update(memberId, updateMemberDto));
		} catch (error) {
			console.error(error.message);
			throw new InternalServerErrorException(`Could not update member: ${error.message}`);
		}
	}

	async saveMembers(members: ChannelMember[]) {
		try {
			return (await this.memberRespitory.save(members));
		} catch (error) {
			console.error(error.message);
			throw new InternalServerErrorException(`Could not save members: ${error.message}`);
		}
	}

	async deleteMember(memberId: number) {
		try {
			return (await this.memberRespitory.delete(memberId));
		} catch (error) {
			console.error(error.message);
			throw new InternalServerErrorException(`Could not delete member: ${error.message}`);
		}
	}

	async removeMember(member: number | ChannelMember | ChannelMember[]) {
		if (typeof(member) === 'number') {
			member = await this.memberRespitory.findOne({ where: { id: member } });
			if (!member) {
				throw new BadRequestException('Member not found');
			}
		}

		try {
			if (Array.isArray(member)) {
				return (await this.memberRespitory.remove(member));
			} else {
				return (await this.memberRespitory.remove(member));
			}
		} catch(error) {
			throw new InternalServerErrorException(`Could not remove membership: ${error.message}`);
		}
	}
}
