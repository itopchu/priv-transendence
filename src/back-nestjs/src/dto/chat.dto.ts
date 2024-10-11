import { PartialType, PickType } from '@nestjs/mapped-types'
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDate, ValidateNested, IsBoolean, Length, IsUUID } from 'class-validator';
import { Channel, ChannelMember, ChannelRoles, ChannelType, Chat, Invite, Message, Mute } from '../entities/chat.entity';
import { UserClient, UserPublicDTO } from './user.dto';
import { Type } from 'class-transformer';

export class CreateChannelDto extends PartialType(PickType(Channel, ['type', 'name', 'password'] as const)) {
  @IsString()
	@IsNotEmpty({ message: 'Channel Name must not be empty' })
	@Length(0, 30)
  name: string;

  @IsString()
  @IsOptional()
	@IsNotEmpty({ message: 'Channel Password must not be empty' })
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
	@Length(0, 20)
	@IsNotEmpty({ message: 'Channel Name must not be empty' })
	name?: string;

	@IsString()
	@IsOptional()
	@IsNotEmpty({ message: 'Channel Password must not be empty' })
	password?: string;

	@IsString()
	@IsOptional()
	@Length(0, 100)
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
	constructor(member: ChannelMember) {
		this.id = member.id;
		this.user = new UserPublicDTO(member.user, null);
		this.role = member.role;
	}

	@IsNumber()
	id: number;

	@IsNotEmpty()
	@ValidateNested()
	@Type(() => UserPublicDTO)
	user: UserPublicDTO;

	@IsEnum(ChannelRoles)
	role: ChannelRoles;
}

export class ChannelPublicDTO {
	constructor(channel: Channel) {
		this.id = channel.id;
		this.image = channel.image ? `${process.env.ORIGIN_URL_BACK}/${channel.image}` : null;
		this.name = channel.name;
		this.description = channel.description;
		this.type = channel.type;

		this.bannedUsers = (channel?.bannedUsers ?? []).map(user => new UserPublicDTO(user, null));
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
	@ValidateNested()
	@Type(() => UserPublicDTO)
	@ValidateNested({ each: true })
	bannedUsers?: UserPublicDTO[];
}

export class InvitePublicDTO {
	constructor(inviteId: string, destination: Channel, isJoined?: boolean) {
		this.id = inviteId;
		this.destination = new ChannelPublicDTO(destination);
		this.isJoined = isJoined;
	}

	@IsUUID()
	@IsNotEmpty()
	id: string;

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

export class ChannelClientDTO {
	constructor(channel: Channel) {
		this.id = channel.id;
		this.image = channel.image ? `${process.env.ORIGIN_URL_BACK}/${channel.image}` : null;
		this.name = channel.name;
		this.description = channel.description;
		this.type = channel.type;

		this.members = (channel?.members ?? []).map(member => new MemberPublicDTO(member));
		this.bannedUsers = (channel?.bannedUsers ?? []).map(user => new UserPublicDTO(user, null));
		this.mutedUsers = (channel?.mutedUsers ?? []).map(user => new MutePublicDTO(user));
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
	@ValidateNested()
	@Type(() => UserPublicDTO)
	@ValidateNested({ each: true })
	bannedUsers?: UserPublicDTO[];

	@IsOptional()
	@ValidateNested({ each: true })
	@Type(() => MutePublicDTO)
	mutedUsers?: MutePublicDTO[];

	@IsNotEmpty()
	@ValidateNested({ each: true })
	@Type(() => MemberPublicDTO)
	members: MemberPublicDTO[];
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
	constructor(member: ChannelMember) {
		this.id = member.id;
		this.user = new UserClient(member.user);
		this.channel = new ChannelClientDTO(member.channel);
		this.role = member.role;
		this.isMuted = member.channel.mutedUsers.some(
			(mute) => mute.user.id === member.user.id
		)
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
}
