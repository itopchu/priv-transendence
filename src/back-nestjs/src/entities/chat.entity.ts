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
	JoinColumn,
    Unique
} from 'typeorm';
import { User } from './user.entity';
import { MaxLength, MinLength, validateOrReject } from 'class-validator';

export const MSG_LIMIT = 1024;
export const CHANNEL_NAME_LIMIT = 30;
export const CHANNEL_DESC_LIMIT = 100;
export const CHANNEL_PASS_LIMIT = 24;

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

	@Column({ length: CHANNEL_NAME_LIMIT })
	@MinLength(1, { message: 'Name is too short' })
	@MaxLength(CHANNEL_NAME_LIMIT, { message: 'Name is too long' })
	name: string;

	@Column({
		length: CHANNEL_DESC_LIMIT,
		default: 'This is a channel for nerds'
	})
	@MinLength(1, { message: 'Description is too short' })
	@MaxLength(CHANNEL_DESC_LIMIT, { message: 'Description is too long' })
	description: string;

	@Column({ nullable: true, default: null })
	@MinLength(1, { message: 'Password is too short' })
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

	@OneToMany(() => Invite, invite => invite.destination, { cascade: ['remove'], })
	invites: Invite[];

	@OneToMany(() => Message, message => message.channel, { cascade: ['remove'], })
	log: Message[];
	
	async validate() {
		await validateOrReject(this);
	}
}

@Entity()
export class Chat {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	status: number;

	@Column()
	modified: Date;

	@ManyToMany(() => User, user => user.chats)
	@JoinTable()
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

	@Column()
	userId: number;

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
@Unique(['id'])
export class Invite {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	destinationId: number;

	@JoinTable()
	@ManyToOne(() => Channel, channel => channel.invites)
	destination: Channel;

	@JoinTable()
	@ManyToOne(() => User)
	creator: User;

	@Column({ type: 'timestamp' })
	expireAt: Date;
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
	@MinLength(1, { message: 'Message is too short' })
	@MaxLength(MSG_LIMIT, { message: 'Message is too long' })
	content: string;

	@Column({
		default: false,
	})
	edited: boolean;
}
