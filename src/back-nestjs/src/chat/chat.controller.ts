import { BadRequestException, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard } from '../auth/auth.guard';
import { ChatService } from "./chat.service";
import { ChatClientDTO, MessagePublicDTO } from "../dto/chat.dto";
import { UserService } from "../user/user.service";
import { ChatGateway } from "./chat.gateway";

@Controller('chat')
export class ChatController {
	constructor(
		private readonly chatService: ChatService,
		private readonly chatGateway: ChatGateway,
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
		return ({ chats: clientChats });
	}

	@Post(':id')
	@UseGuards(AuthGuard)
	async createChat(@Req() req: Request, @Param('id', ParseIntPipe) receiverId: number) {
		const user = req.authUser;

		if (user.id === receiverId) {
			throw new BadRequestException('User dming themselves, try making some friends maybe?');
		}

		const chat = await this.chatService.getChatByUsersId(user.id, receiverId);
		if (chat) {
			return ({ chat: new ChatClientDTO(chat, user.id) });
		}

		const receiver = await this.userService.getUserById(receiverId);
		if (!receiver) {
			throw new NotFoundException('Recipient not found');
		}

		await this.chatService.validateRelationship(user.id, receiver.id);

		const newChat = await this.chatService.createChat(user, receiver);
		this.chatGateway.emitNewChat(newChat);
		return ({ chat: new ChatClientDTO(newChat, user.id) });
	}
}
