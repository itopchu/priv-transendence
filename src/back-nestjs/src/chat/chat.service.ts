import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Chat, Message } from "../entities/chat.entity";
import { User } from "../entities/user.entity";
import { Repository, In } from "typeorm";
import { MessageService } from "./message/message.service";

@Injectable()
export class ChatService {
	constructor(
		@InjectRepository(Chat)
		private chatRepository: Repository<Chat>,
		private readonly messageService: MessageService,
	) {}

	async getChatById(chatId: number, relations: string[]) {
		try {
			const chat = await this.chatRepository.findOne({
				where: { id: chatId },
				relations: relations,
			});

			return (chat);
		} catch (error) {
			console.error(error.message);
			throw new InternalServerErrorException(`Could not get chat by id: ${error.message}`);
		}
	}

	async getUserChats(user: User) {
		try {
			const chatIds = await this.chatRepository.createQueryBuilder('chat')
				.leftJoinAndSelect('chat.users', 'users')
				.where('users.id = :id', { id: user.id })
				.getRawMany()

			const chats = await this.chatRepository.find({
				where: { id: In(chatIds.map(chat => chat.chat_id)) },
				relations: ['users'],
			});

			return (chats);
		} catch (error) {
			console.error(error.message);
			throw new InternalServerErrorException(`Could not get user chats: ${error.message}`);
		}
	}

	async createChat(user: User, recipient: User) {
		const newChat = this.chatRepository.create({
			modified: new Date(),
			status: 0, //change later?
			users: [user, recipient],
		});

		try {
			return (await this.chatRepository.save(newChat));
		} catch (error) {
			console.error(error.message);
			throw new InternalServerErrorException(`Could not create a new chat: ${error.message}`);
		}
	}

	async logMessage(chatId: number, author: User, message: string): Promise<Message> {
		if (!message?.length) {
			throw new BadRequestException('Empty message');
		}

		const chat = await this.getChatById(chatId, ['users']);
		if (!chat) {
			throw new NotFoundException('Chat not found');
		}

		const isInChat = chat.users.some((user) => user.id === author.id);
		if (!isInChat) {
			throw new UnauthorizedException('Unauthorized: Author is not in chat');
		}

		const newMessage = await this.messageService.createMessage(chat, author, message);
		await this.chatRepository.update(chat.id, { modified: new Date() });

		return (newMessage);
	}
}
