import { PartialType, PickType } from '@nestjs/mapped-types'
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { Channel, ChannelMember, ChannelRoles, ChannelType } from '../entities/channel.entity';


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

export class UpdateChannelDto extends PartialType(PickType(Channel, ['type', 'name', 'password', 'image', 'description'] as const)) {
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

export class UpdateMemberDto extends PartialType(PickType(ChannelMember, ['muted', 'role'] as const)) {
	@IsBoolean()
	@IsOptional()
	@IsNotEmpty()
	muted?: boolean;

	@IsEnum(ChannelRoles)
	@IsOptional()
	@IsNotEmpty()
	role?: ChannelRoles;
}
