import { PartialType, PickType } from '@nestjs/mapped-types'
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ChannelMember, ChannelRoles, ChannelType } from 'src/entities/channel.entity';


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

export class UpdateChannelMemberDto extends PartialType(PickType(ChannelMember, ['id', 'muted', 'role'] as const)) {
	@IsBoolean()
	@IsOptional()
	@IsNotEmpty()
	muted?: boolean;

	@IsEnum(ChannelRoles)
	@IsOptional()
	@IsNotEmpty()
	role?: ChannelRoles;
}
