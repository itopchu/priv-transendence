import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Chat, Message, Channel, Invite } from "../../entities/chat.entity";
import { User } from "../../entities/user.entity";
import { Repository } from "typeorm";

@Injectable()
export class MessageService {
	constructor(
		@InjectRepository(Message)
		private messageRespitory: Repository<Message>,
	) {}

	async getChannelLog(channelId: number): Promise<Message[]>  {
		const log = await this.messageRespitory.createQueryBuilder('msg')
		.innerJoin('msg.channel', 'channel')
		.where('channel.id = :id', { id: channelId })
		.leftJoinAndSelect('msg.author', 'author')
		.getMany();

		return (log);
	}

	async getMessageById(msgId: number, requestedRelations?: string[]) {
		const msg = await this.messageRespitory.findOne({
			where: { id: msgId },
			relations: requestedRelations,
		})

		return (msg);
	}

	async createMessage(chat: Chat | Channel, author: User, message: string) {
		const newMessage = new Message;
		newMessage.author = author;
		newMessage.content = message;

		if (chat instanceof Channel) {
			newMessage.channel = chat;
			newMessage.chat = null;
			console.log(`${author.nameFirst} said "${message}" and has been logged in channel`);
		} else {
			newMessage.chat = chat;
			newMessage.channel = null;
			console.log(`${author.nameFirst} said "${message}" and has been logged in direct message`);
		}

		try  {
			return (await this.messageRespitory.save(newMessage));
		} catch (error) {
			console.error(error.message);
			throw new InternalServerErrorException (`Could not create new message: ${error.message}`);
		}
	}

	async validateMessage(user: User, msgId: number) {
		const msg = await this.getMessageById(msgId, ['author', 'channel', 'chat']);
		if (!msg) {
			throw new NotFoundException('Message not found');
		}
		if (msg.author.id !== user.id) {
			throw new UnauthorizedException('Unauthorized: User is not the author');
		}
		return (msg);
	}

	async removeMessages(messages: Message[]) {
		if (!messages.length) return;

		await this.messageRespitory.remove(messages);
	}

	async editMessage(msgId: number, newContent: string) {
		await this.messageRespitory.update(msgId, { content: newContent, edited: true });
	}
}
