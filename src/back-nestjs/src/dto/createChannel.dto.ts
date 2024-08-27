import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ChannelType } from 'src/entities/channel.entity';

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
