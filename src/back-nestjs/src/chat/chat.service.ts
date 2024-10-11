import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Chat, Message } from "../entities/chat.entity";
import { FriendshipAttitude, User } from "../entities/user.entity";
import { Repository, In } from "typeorm";
import { MessageService } from "./message/message.service";
import { UserService } from "../user/user.service";

@Injectable()
export class ChatService {
	constructor(
		@InjectRepository(Chat)
		private chatRepository: Repository<Chat>,
		private readonly messageService: MessageService,
		private readonly userService: UserService,
	) {}

	async isUserInChat(chatId: number, userId: number) {
		const count = await this.chatRepository
			.createQueryBuilder('chat')
			.innerJoin('users.users', 'user', 'user.id = :userId', { userId })
			.where('chat.id = :chatId', { chatId })
			.getCount();

		return (count > 0);
	}

	async getChatById(chatId: number, relations?: string[]) {
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

	async getChatByUsersId(user1Id: number, user2Id: number): Promise<Chat | null> {
		try {
			const chat = await this.chatRepository.createQueryBuilder('chat')
				.leftJoinAndSelect('chat.users', 'users')
				.where('users.id IN (:...userIds)', { userIds: [user1Id, user2Id] })
				.groupBy('chat.id')
				.having('COUNT(DISTINCT users.id) = 2')
				.select('chat', 'users')
				.getOne();

			return (chat);
		} catch (error) {
			console.error(error.message);
			throw new InternalServerErrorException(`Could not get chat by users: ${error.message}`);
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

	async createChat(sender: User, receiver: User) {
		const newChat = this.chatRepository.create({
			modified: new Date(),
			status: 0, //change later?
			users: [sender, receiver],
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

	async validateRelationship(senderId: number, receiverId: number) {
		const relationship = await this.userService.getUserFriendship(
			{ id: senderId } as User,
			{ id: receiverId } as User
		);

		if (relationship) {
			let restrictedUser: User = undefined;
			if (relationship.user1Attitude === FriendshipAttitude.restricted) {
				restrictedUser = relationship.user2;
			}
			if (relationship.user2Attitude === FriendshipAttitude.restricted) {
				restrictedUser = relationship.user1;
			}
			if (restrictedUser) { 
				if (restrictedUser.id === senderId)
					throw new UnauthorizedException('Unauthorized: This user has blocked you');
				throw new UnauthorizedException('Unauthorized: You have blocked this user');
			}
		}
	}
}
