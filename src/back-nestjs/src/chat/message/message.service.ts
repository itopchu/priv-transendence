import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Chat, Message, Channel } from "../../entities/channel.entity";
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
		.leftJoinAndSelect('msg.author', 'author')
		.where('channel.id = :id', { id: channelId })
		.getMany();

		return (log);
	}

	async createMessage(chat: Chat | Channel, author: User, message: string) {
		const newMessage = new Message;
		newMessage.author = author;
		newMessage.content = message;

		if (chat instanceof Channel) {
			newMessage.channel = chat;
			newMessage.chat = null;
		} else {
			newMessage.chat = chat;
			newMessage.channel = null;
		}

		console.log(`${author.nameFirst} said "${message}" and has been logged`);
		try  {
			return (await this.messageRespitory.save(newMessage));
		} catch (error) {
			console.error(error.message);
			throw new InternalServerErrorException (`Could not create new message: ${error.message}`);
		}
	}

	async removeMessages(messages: Message[]) {
		if (!messages.length) return;

		await this.messageRespitory.remove(messages);
	}
}
