import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './user.entity';

export enum ChannelType {
	public,
	private,
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

	@Column({ nullable: true, default: null })
	password: string | null;

	@Column({ default: ChannelType.private })
	type: ChannelType;

	@OneToMany(() => ChannelMember, members => members.user)
	members: ChannelMember[];

	@OneToMany(() => Message, message => message.channel)
	log: Message[];
}

@Entity()
export class ChannelMember {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => User, user => user.channels)
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
	
	@ManyToOne(() => Channel, channel => channel.log)
	channel: Channel;

	@ManyToOne(() => User, author => author.messages)
	author: User;

	@Column()
	content: string;
}
