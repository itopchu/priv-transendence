import { PartialType, PickType } from '@nestjs/mapped-types'
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsNumber, isNotEmptyObject, isNotEmpty, IsDate, Validate, ValidateNested } from 'class-validator';
import { Channel, ChannelMember, ChannelRoles, ChannelType, Chat, Message, Mute } from '../entities/channel.entity';
import { UserClient, UserPublicDTO } from './user.dto';
import { User } from '../entities/user.entity';
import { Type } from 'class-transformer';


export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  password?: string;

  @IsString()
  @IsNotEmpty()
  type: ChannelType;
}

export class UpdateChannelDto extends PartialType(PickType(Channel, ['type', 'name', 'password', 'description'] as const)) {
	@IsEnum(ChannelType)
	@IsOptional()
	@IsNotEmpty()
	type?: ChannelType;

	@IsString()
	@IsOptional()
	@IsNotEmpty()
	name?: string;

	@IsString()
	@IsOptional()
	@IsNotEmpty()
	password?: string;

	@IsString()
	@IsOptional()
	@IsNotEmpty()
	description?: string;
}

export class UpdateMemberDto extends PartialType(PickType(ChannelMember, ['role'] as const)) {
	@IsEnum(ChannelRoles)
	@IsOptional()
	@IsNotEmpty()
	role?: ChannelRoles;
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

export class MessagePublicDTO {
	constructor(message: Message) {
		this.id = message.id;
		this.timestamp = message.timestamp;
		this.author = new UserPublicDTO(message.author, null);
		this.content = message.content;
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
}

export class ChannelPublicDTO {
	constructor(channel: Channel) {
		this.id = channel.id;
		this.image = channel.image ? `${process.env.ORIGIN_URL_BACK}/${channel.image}` : null;
		this.name = channel.name;
		this.description = channel.description;
		this.type = channel.type;

		this.members = (channel?.members ?? []).map(member => new MemberPublicDTO(member));
		this.bannedUsers = (channel?.bannedUsers ?? []).map(user => new UserPublicDTO(user, null));
		this.mutedUsers = (channel?.mutedUsers ?? []).map(user => new MutePublicDTO(user));
		this.log = (channel?.log ?? []).map(message => new MessagePublicDTO(message));
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

	@IsNotEmpty()
	@ValidateNested({ each: true })
	@Type(() => MessagePublicDTO)
	log: MessagePublicDTO[];
}

export class ChatClientDTO {
	constructor(chat: Chat, userId: number) {
		this.id = chat.id;

		const otherUser = chat.users[0] //chat.users[0].id === userId ? chat.users[1] : chat.users[0];
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
		this.channel = new ChannelPublicDTO(member.channel);
		this.role = member.role;
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
}
