import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelService } from './channel.service';
import { ChannelController } from './channel.controller';
import { ChannelGateway } from './channel.gateway';
import { Channel, ChannelMember, Message, MutedUser } from '../entities/channel.entity';
import { UserModule } from '../user/user.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Channel, ChannelMember, Message, MutedUser]),
		UserModule,
	],
	providers: [ChannelService, ChannelGateway],
	controllers: [ChannelController],
	exports: [ChannelService],
})
export class ChannelModule {}
