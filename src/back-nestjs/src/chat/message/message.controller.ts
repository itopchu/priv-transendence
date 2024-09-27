import {
	Body,
	Controller,
	Delete,
	NotFoundException,
	Param,
	ParseIntPipe,
	Patch,
	Req,
	UseGuards,
} from "@nestjs/common";
import { MessageService } from "./message.service";
import { AuthGuard } from "../../auth/auth.guard";
import { MessagePublicDTO, UpdateMessageDto } from "../../dto/chat.dto";
import { Request } from "express";
import { ChatGateway, UpdateType } from "../chat.gateway";

@Controller('message')
export class MessageController {
	constructor(
		private readonly messageService: MessageService,
		private readonly chatGateway: ChatGateway,
	)  {}

	@Patch(':id')
	@UseGuards(AuthGuard)
	async editMessage(
		@Req() req: Request,
		@Param('id', ParseIntPipe) msgId: number,
		@Body('payload') updateMessageDto: UpdateMessageDto,
	) {
		const user = req.authUser;

		const msg = await this.messageService.validateMessage(user, msgId);
		if (msg.content === updateMessageDto.content) return;

		await this.messageService.editMessage(msgId, updateMessageDto.content);
		const updatedMsg = await this.messageService.getMessageById(msgId, ['author']);
		if (!updatedMsg) {
			throw new NotFoundException('Message not found after edit');
		}
		const publicMsg = new MessagePublicDTO(updatedMsg);
		if (msg.channel) {
			this.chatGateway.emitChannelMessageUpdate(msg.channel.id, publicMsg, UpdateType.updated);
		} else {
			this.chatGateway.emitChatMessageUpdate(msg.chat, publicMsg, UpdateType.updated);
		}
	}

	@Delete(':id')
	@UseGuards(AuthGuard)
	async deleteMessage(@Req() req: Request, @Param('id', ParseIntPipe) msgId: number) {
		const user = req.authUser;

		const msg = await this.messageService.validateMessage(user, msgId);
		await this.messageService.removeMessages([msg]);

		if (msg.channel) {
			this.chatGateway.emitChannelMessageUpdate(
				msg.channel.id,
				{ id: msgId } as MessagePublicDTO,
				UpdateType.deleted
			);
		} else {
			this.chatGateway.emitChatMessageUpdate(
				msg.chat, 
				{ id: msgId } as MessagePublicDTO,
				UpdateType.deleted
			);
		}
	}
}
