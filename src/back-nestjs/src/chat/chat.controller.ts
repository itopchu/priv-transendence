import { Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard } from '../auth/auth.guard';
import { ChatService } from "./chat.service";
import { ChatClientDTO, MessagePublicDTO } from "../dto/channel.dto";
import { UserService } from "../user/user.service";

@Controller('chat')
export class ChatController {
	constructor(
		private readonly chatService: ChatService,
		private readonly userService: UserService,
	) {}

	@Get('messages/:id')
	@UseGuards(AuthGuard)
	async getMessageLog(@Req() req: Request, @Param('id', ParseIntPipe) chatId: number) {
		const user = req.authUser;

		const chat = await this.chatService.getChatById(chatId, ['users', 'log', 'log.author']);
		if (!chat) {
			throw new NotFoundException('Chat not found');
		}

		const isInChat = chat.users.some((chatUser) => chatUser.id === user.id);
		if (!isInChat) {
			throw new UnauthorizedException('Unauthorized: User is not in chat');
		}

		const publicLog = chat.log.map(message => new MessagePublicDTO(message));
		return ({ messages: publicLog });
	}

	@Get()
	@UseGuards(AuthGuard)
	async getChats(@Req() req: Request) {
		const user = req.authUser;

		const chats = await this.chatService.getUserChats(user);
		const clientChats = chats.map(chat => new ChatClientDTO(chat, user.id));
		return (clientChats);
	}

	@Post(':id')
	@UseGuards(AuthGuard)
	async createChat(@Req() req: Request, @Param('id', ParseIntPipe) recipientId: number) {
		const user = req.authUser;

		const recipient = await this.userService.getUserByIdWithRel(recipientId, ['blockedUsers']);
		if (!recipient) {
			throw new NotFoundException('Recipient not found');
		}

		const isBlocked = recipient.blockedUsers.some((blockedUser) => blockedUser.id === user.id);
		if (isBlocked) {
			throw new UnauthorizedException('Unauthorized: User is block');
		}

		await this.chatService.createChat(user, recipient);
	}
}
