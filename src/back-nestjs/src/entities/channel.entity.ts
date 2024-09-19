import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	ManyToOne,
	OneToMany,
	ManyToMany,
	JoinTable,
	PrimaryColumn,
	JoinColumn
} from 'typeorm';
import { User } from './user.entity';

export enum ChannelType {
	private = 'private',
	protected = 'protected',
	public = 'public',
}

export enum ChannelRoles {
	admin,
	moderator,
	member,
}

@Entity()
export class Channel {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ nullable: true, default: null })
	image: string | null;

	@Column()
	name: string;

	@Column({ default: 'This is a channel for nerds' })
	description: string;

	@Column({ nullable: true, default: null })
	password: string | null;

	@Column({
		type: 'enum',
		enum: ChannelType,
		default: ChannelType.private,
	})
	type: ChannelType;

	@JoinTable()
	@ManyToMany(() =>  User)
	bannedUsers: User[];

	@OneToMany(() => Mute, mutedMembers => mutedMembers.channel, { cascade: ['remove'], })
	mutedUsers: Mute[];

	@OneToMany(() => ChannelMember, member => member.channel, { cascade: ['remove'], })
	members: ChannelMember[];

	@OneToMany(() => Message, message => message.channel, { cascade: ['remove'], })
	log: Message[];
}

@Entity()
export class Chat {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	status: number;

	@Column()
	modified: Date;

	@JoinTable()
	@ManyToMany(() => User, user => user.chats)
	users: User[];

	@OneToMany(() => Message, message => message.chat)
	log: Message[];
}

@Entity()
export class Mute {
	@PrimaryColumn()
	userId: number;

	@PrimaryColumn()
	channelId: number;

	@JoinColumn()
	@ManyToOne(() => User)
	user: User;

	@ManyToOne(() => Channel, channel => channel.mutedUsers)
	channel: Channel;

	@Column({ nullable: true, default: null })
	muteUntil: Date;
}

@Entity()
export class ChannelMember {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => User, user => user.memberships)
	user: User;

	@ManyToOne(() => Channel, channel => channel.members)
	channel: Channel;

	@Column({
		type: 'enum',
		enum: ChannelRoles,
		default: ChannelRoles.member,
	})
	role: ChannelRoles;
}

@Entity()
export class Message {
	@PrimaryGeneratedColumn()
	id: number;

	@CreateDateColumn()
	timestamp: Date;
	
	@ManyToOne(() => Channel, channel => channel.log, { nullable: true })
	channel: Channel | null;

	@ManyToOne(() => Chat, chat => chat.log, { nullable: true })
	chat: Chat | null;

	@ManyToOne(() => User)
	author: User;

	@Column()
	content: string;
}
