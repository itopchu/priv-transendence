import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { ChannelsGateway } from './channels.gateway';

@Module({
  providers: [ChannelsService, ChannelsGateway],
  controllers: [ChannelsController]
})
export class ChannelsModule {}
