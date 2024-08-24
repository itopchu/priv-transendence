import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ChannelType } from 'src/entities/channel.entity';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsNotEmpty()
  type: ChannelType;
}
