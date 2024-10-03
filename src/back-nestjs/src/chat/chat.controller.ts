import { BadRequestException, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard } from '../auth/auth.guard';
import { ChatService } from "./chat.service";
import { ChatClientDTO, MessagePublicDTO } from "../dto/chat.dto";
import { UserService } from "../user/user.service";
import { ChatGateway } from "./chat.gateway";
import { FriendshipAttitude, User } from "../entities/user.entity";
import { messageLocation, MessageService } from "./message/message.service";

@Controller('chat')
export class ChatController {
	constructor(
		private readonly chatService: ChatService,
		private readonly chatGateway: ChatGateway,
		private readonly userService: UserService,
		private readonly messageService: MessageService,
	) {}

	@Get('messages/:id/:cursor?')
	@UseGuards(AuthGuard)
	async getMessageLog(
		@Req() req: Request,
		@Param('id', ParseIntPipe) chatId: number,
		@Param('cursor', ParseIntPipe) cursor?: number,
	) {
		const user = req.authUser;

		const chat = await this.chatService.getChatById(chatId, ['users']);
		if (!chat) {
			throw new NotFoundException('Chat not found');
		}

		const isInChat = chat.users.some((chatUser) => chatUser.id === user.id);
		if (!isInChat) {
			throw new UnauthorizedException('Unauthorized: User is not in chat');
		}

		const log = await this.messageService.getMessages(messageLocation.chat, chatId, cursor);
		const publicLog = log.map(message => new MessagePublicDTO(message));
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
	async createChat(@Req() req: Request, @Param('id', ParseIntPipe) recipientId: number) {
		const user = req.authUser;

		if (user.id === recipientId) {
			throw new BadRequestException('User dming themselves, try making some friends maybe?');
		}

		const recipient = await this.userService.getUserById(recipientId);
		if (!recipient) {
			throw new NotFoundException('Recipient not found');
		}

		const userChats = await this.chatService.getUserChats(user);
		for (const chat of userChats ?? []) {
			const alreadyExists = chat.users.find((chatUser) => chatUser.id === recipientId);
			if (alreadyExists) {
				return (alreadyExists);
			}
		}

		const relationship = await this.userService.getUserFriendship(user, recipient);
		if (relationship) {
			let restrictedUser: User = undefined;
			if (relationship.user1Attitude === FriendshipAttitude.restricted) {
				restrictedUser = relationship.user2;
			}
			if (relationship.user2Attitude === FriendshipAttitude.restricted) {
				restrictedUser = relationship.user1;
			}
			if (restrictedUser) { 
				if (restrictedUser.id === user.id)
					throw new UnauthorizedException('Unauthorized: This user has blocked you');
				throw new UnauthorizedException('Unauthorized: You have blocked this user');
			}
		}

		const newChat = await this.chatService.createChat(user, recipient);
		this.chatGateway.emitNewChat(newChat);
		return ({ chat: new ChatClientDTO(newChat, user.id) });
	}
}
