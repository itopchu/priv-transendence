import { PartialType, PickType } from '@nestjs/mapped-types'
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDate, ValidateNested, IsBoolean, Length, IsUUID } from 'class-validator';
import { UserClient, UserPublicDTO } from './user.dto';
import { Type } from 'class-transformer';
import {
	Channel,
	CHANNEL_DESC_LIMIT,
	CHANNEL_NAME_LIMIT,
	CHANNEL_PASS_LIMIT,
	MSG_LIMIT,
	ChannelMember,
	ChannelRoles,
	ChannelType,
	Chat,
	Invite,
	Message,
	Mute
} from '../entities/chat.entity';

export class CreateChannelDto extends PartialType(PickType(Channel, ['type', 'name', 'password'] as const)) {
	@IsString()
	@IsNotEmpty({ message: 'Channel Name must not be empty' })
	@Length(1, CHANNEL_NAME_LIMIT)
	name: string;

	@IsString()
	@IsOptional()
	@IsNotEmpty({ message: 'Channel Password must not be empty' })
	@Length(1, CHANNEL_PASS_LIMIT)
	password?: string;

	@IsEnum(ChannelType)
	@IsNotEmpty({ message: 'Channel Type must not be empty' })
	type: ChannelType;
}

export class UpdateChannelDto extends PartialType(PickType(Channel, ['type', 'name', 'password', 'description'] as const)) {
	@IsEnum(ChannelType)
	@IsOptional()
	@IsNotEmpty({  message: 'Channel Type must not be empty' })
	type?: ChannelType;

	@IsString()
	@IsOptional()
	@Length(1, CHANNEL_NAME_LIMIT)
	@IsNotEmpty({ message: 'Channel Name must not be empty' })
	name?: string;

	@IsString()
	@IsOptional()
	@IsNotEmpty({ message: 'Channel Password must not be empty' })
	@Length(1, CHANNEL_PASS_LIMIT)
	password?: string;

	@IsString()
	@IsOptional()
	@Length(1, CHANNEL_DESC_LIMIT)
	@IsNotEmpty({ message: 'Channel Description must not be empty' })
	description?: string;
}

export class UpdateMemberDto extends PartialType(PickType(ChannelMember, ['role'] as const)) {
	@IsEnum(ChannelRoles)
	@IsOptional()
	@IsNotEmpty()
	role?: ChannelRoles;
}

export class UpdateMessageDto extends PartialType(PickType(Message, ['content'] as const)) {
	@IsNotEmpty({ message: 'Content must not be empty' })
	@Length(1, MSG_LIMIT)
	content: string;
}

export class MutePublicDTO {
	constructor(mute: Mute) {
		this.userId = mute.userId;
		this.channelId = mute.channelId;
		this.user = new UserPublicDTO(mute.user, null);
		this.muteUntil = mute.muteUntil;
	}

	@IsNumber()
	userId: number;

	@IsNumber()
	channelId: number;

	@IsNotEmpty()
	@ValidateNested()
	@Type(() => UserPublicDTO)
	user: UserPublicDTO;

	@IsDate()
	@Type(() => Date)
	muteUntil: Date;
}

export class MemberPublicDTO {
	constructor(member: ChannelMember, isMuted?: boolean) {
		this.id = member.id;
		this.user = new UserPublicDTO(member.user, null);
		this.role = member.role;

		if (isMuted !== undefined) {
			this.isMuted = isMuted
		}
	}

	@IsNumber()
	id: number;

	@IsNotEmpty()
	@ValidateNested()
	@Type(() => UserPublicDTO)
	user: UserPublicDTO;

	@IsEnum(ChannelRoles)
	role: ChannelRoles;

	@IsBoolean()
	@IsOptional()
	isMuted?: boolean;
}

export class ChannelPublicDTO {
	constructor(channel: Channel, userId?: number) {
		this.id = channel.id;
		this.image = channel.image ? `${process.env.ORIGIN_URL_BACK}/${channel.image}` : null;
		this.name = channel.name;
		this.description = channel.description;
		this.type = channel.type;

		if (channel.members) {
			if (userId) {
				this.isJoined = channel.members.some((member) => member?.userId === userId);
			}
			this.memberCount = channel.members.length;
		}
		if (channel.bannedUsers && userId) {
			this.isBanned = channel.bannedUsers.some((bannedUser) => bannedUser.id === userId);
		}
	}

	@IsNumber()
	id: number;

	@IsString()
	@IsOptional()
	image?: string | null;

	@IsString()
	@IsNotEmpty()
	name: string;

	@IsString()
	@IsNotEmpty()
	description: string;

	@IsEnum(ChannelType)
	type: ChannelType;

	@IsOptional()
	@IsBoolean()
	isJoined?: boolean;

	@IsOptional()
	@IsBoolean()
	isBanned?: boolean;

	@IsOptional()
	@IsNumber()
	memberCount?: number;
}

export class InvitePublicDTO {
	constructor(invite: Invite, userId: number) {
		this.id = invite.id;
		this.destination = new ChannelPublicDTO(invite.destination);
		this.isJoined = invite.destination.members.some((member) => member.userId === userId);
	}

	@IsUUID()
	@IsNotEmpty()
	id: string;

	@IsNotEmpty()
	@ValidateNested()
	@Type(() => UserPublicDTO)
	destination: ChannelPublicDTO;

	@IsBoolean()
	isJoined: boolean;
}

export class MessagePublicDTO {
	constructor(message: Message) {
		this.id = message.id;
		this.timestamp = message.timestamp;
		this.author = new UserPublicDTO(message.author, null);
		this.content = message.content;
		this.edited = message.edited;
	}

	@IsNumber()
	id: number;

	@IsDate()
	@Type(() => Date)
	timestamp: Date;
	
	@IsNotEmpty()
	@ValidateNested()
	@Type(() => UserPublicDTO)
	author: UserPublicDTO;

	@IsString()
	@IsNotEmpty()
	content: string;

	@IsBoolean()
	edited: boolean
}

export class ChatClientDTO {
	constructor(chat: Chat, userId: number) {
		this.id = chat.id;

		const otherUser = chat.users[0].id === userId ? chat.users[1] : chat.users[0];
		this.user = new UserPublicDTO(otherUser, null);
		this.log = (chat?.log ?? []).map(message => new MessagePublicDTO(message));
	}

	@IsNumber()
	id: number;

	@ValidateNested()
	@Type(() => UserPublicDTO)
	@ValidateNested({ each: true })
	user: UserPublicDTO;

	@ValidateNested({ each: true })
	@Type(() => MessagePublicDTO)
	log: MessagePublicDTO[];
}

export class MemberClientDTO {
	constructor(member: ChannelMember, userId: number) {
		this.id = member.id;
		this.user = new UserClient(member.user);
		this.channel = new ChannelPublicDTO(member.channel);
		this.role = member.role;
		this.membersCount = member.channel.members.length;

		if (member.channel?.mutedUsers) {
			this.isMuted = member.channel.mutedUsers.some((mute) =>
				mute.userId === userId
			)
		}
	}

	@IsNumber()
	id: number;

	@IsNotEmpty()
	user: UserClient;

	@IsNotEmpty()
	@ValidateNested()
	@Type(() => ChannelPublicDTO)
	channel: ChannelPublicDTO;

	@IsEnum(ChannelRoles)
	role: ChannelRoles;

	@IsNotEmpty()
	@IsBoolean()
	isMuted: Boolean

	@IsNumber()
	membersCount: number;
}
