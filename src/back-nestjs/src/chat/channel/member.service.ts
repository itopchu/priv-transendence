import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UpdateMemberDto } from "../../dto/channel.dto";
import { ChannelMember, Channel, ChannelRoles } from "../../entities/channel.entity";
import { User } from "../../entities/user.entity";
import { Repository } from "typeorm";

@Injectable()
export class MemberService {
	constructor(
		@InjectRepository(ChannelMember)
		private memberRespitory: Repository<ChannelMember>,
	) {}

	async getMembershipById(member: number | ChannelMember): Promise<ChannelMember> {
		const membership = await this.memberRespitory.createQueryBuilder('membership')
		.where('membership.id = :id', { id: typeof member === 'number' ?  member : member.id })
		.leftJoinAndSelect('membership.user', 'user')
		.leftJoinAndSelect('membership.channel', 'channel')
		.leftJoinAndSelect('channel.bannedUsers', 'bannedUsers')
		.leftJoinAndSelect('channel.members', 'members')
		.leftJoinAndSelect('members.user', 'channelUsers')
		.getOne()

		return (membership);
	}

	async getMembershipByChannel(channelId: number, userId: number): Promise<ChannelMember> {
		const membership = await this.memberRespitory.createQueryBuilder('membership')
		.leftJoinAndSelect('membership.user', 'user')
		.where('user.id = :userId', { userId })
		.leftJoinAndSelect('membership.channel', 'channel')
		.andWhere('channel.id = :channelId', { channelId })
		.leftJoinAndSelect('channel.bannedUsers', 'bannedUsers')
		.leftJoinAndSelect('channel.members', 'members')
		.leftJoinAndSelect('members.user', 'channelUsers')
		.getOne()

		return (membership);
	}

	async getMemberships(user: User): Promise<ChannelMember[]> {
		const userMemberships = await this.memberRespitory.createQueryBuilder('membership')
		.leftJoinAndSelect('membership.user', 'user')
		.where('user.id = :id', { id: user.id })
		.leftJoinAndSelect('membership.channel', 'channel')
		.leftJoinAndSelect('channel.bannedUsers', 'bannedUsers')
		.leftJoinAndSelect('channel.members', 'members')
		.leftJoinAndSelect('members.user', 'channelUsers')
		.getMany();
		
		return (userMemberships);
	}

	async createMember(channel: Channel, user: User, role?: ChannelRoles): Promise<ChannelMember> {
		const newMember = this.memberRespitory.create({
			role: role,
			user: user,
			channel: channel,
		})
		try {
			return (await this.memberRespitory.save(newMember));
		} catch(error) {
			throw new InternalServerErrorException('Failed to create new channel member');
		}
	}

	async updateMember(user: User, member: number | ChannelMember, updateMemberDto: UpdateMemberDto) {
		if (typeof member === 'number' || !member.channel) {
			member = await this.getMembershipById(member);
			if (!member) {
				throw new NotFoundException('Member not found');
			}
		}

		const userMembership = await this.getMembershipByChannel(member.channel.id, user.id);
		if (!userMembership) {
			throw new UnauthorizedException('Unauthorized: Membership not found');
		}

		if (userMembership.id === member.id) {
			throw new BadRequestException('User changing its own membership, Stop messing around!');
		}

		if (userMembership.role > member.role) {
			throw new UnauthorizedException('Unauthorized: Insufficient privileges');
		}

		try {
			return (await this.memberRespitory.update(member.id, updateMemberDto));
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
