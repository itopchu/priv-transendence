import { PartialType, PickType } from '@nestjs/mapped-types'
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsNumber, isNotEmptyObject, isNotEmpty, IsDate, Validate, ValidateNested } from 'class-validator';
import { Channel, ChannelMember, ChannelRoles, ChannelType, Message, Mute } from '../entities/channel.entity';
import { UserPublicDTO } from './user.dto';
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

		this.members = [];
		for (const member of channel.members ?? []) {
			this.members.push(new MemberPublicDTO(member));
		}
		this.bannedUsers = [];
		for (const bannedUsers of channel.bannedUsers ?? []) {
			this.bannedUsers.push(new UserPublicDTO(bannedUsers, null));
		}
		this.mutedUsers = [];
		for (const mute of channel.mutedUsers ?? []) {
			this.mutedUsers.push(new MutePublicDTO(mute));
		}
		this.log = [];
		for (const message of channel.log ?? []) {
			this.log.push(new MessagePublicDTO(message));
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

export class MemberClientDTO {
	constructor(member: ChannelMember) {
		this.id = member.id;
		this.user = member.user;
		this.channel = new ChannelPublicDTO(member.channel);
		this.role = member.role;
	}

	@IsNumber()
	id: number;

	@IsNotEmpty()
	user: User;

	@IsNotEmpty()
	@ValidateNested()
	@Type(() => ChannelPublicDTO)
	channel: ChannelPublicDTO;

	@IsEnum(ChannelRoles)
	role: ChannelRoles;
}
