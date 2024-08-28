import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { User } from './user.entity';

export type ChannelType = 'private' | 'protected' | 'public';

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

	@Column({ default: 'private' })
	type: ChannelType;

	@JoinTable()
	@ManyToMany(() =>  User, banList => banList.bannedChannels)
	banList: User[];

	@OneToMany(() => ChannelMember, member => member.channel)
	members: ChannelMember[];

	@OneToMany(() => Message, message => message.channel)
	log: Message[];
}

@Entity()
export class ChannelMember {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => User, user => user.memberships)
	user: User;

	@ManyToOne(() => Channel, channel => channel.members)
	channel: Channel;

	@Column({ default: false })
	muted: boolean;

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
