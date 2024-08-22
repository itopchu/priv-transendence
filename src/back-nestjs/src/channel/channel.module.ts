import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelService } from './channel.service';
import { ChannelController } from './channel.controller';
import { ChannelGateway } from './channel.gateway';
import { Channel, ChannelMember, Message } from '../entities/channel.entity';
import { UserModule } from '../user/user.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([Channel, ChannelMember, Message]),
		UserModule,
	],
	providers: [ChannelService, ChannelGateway],
	controllers: [ChannelController],
	exports: [ChannelService],
})
export class ChannelModule {}
