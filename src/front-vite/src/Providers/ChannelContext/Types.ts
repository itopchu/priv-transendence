import { User, UserPublic } from "../UserContext/User";

export type formatDateType = {
	date: string;
	particle: string;
	time: string;
};

export enum ChannelType {
	private = 'private',
	protected = 'protected',
	public = 'public',
}

export const enum ChannelFilters {
	myChannels = 'My Channels',
	protected = 'Protected',
	public = 'Public',
}

export const ChannelFilterValues: ChannelFilters[] = [
	ChannelFilters.myChannels,
	ChannelFilters.protected,
	ChannelFilters.public,
]

export const ChannelTypeValues: ChannelType[] = [
	ChannelType.private,
	ChannelType.protected,
	ChannelType.public
];

export const ChannelRoleValues: string[] = [
	'admin',
	'moderator',
	'member',
]

export enum ChannelRole {
	admin,
	moderator,
	member,
}

export const enum ChannelStates {
	chat = 'chat',
	details = 'details',
}

export type ChannelLinePropsType = {
	filter: ChannelFilters,
	channels: Channel[],
	hidden: boolean,
	loading: boolean,
}

export type ChannelPropsType = {
	memberships: ChannelMember[],
	selected: ChannelMember | undefined,
	selectedJoin: Channel | undefined,
	state: ChannelStates | undefined,
}

export type ChannelMember = {
	id: number;
	user: User;
	channel: Channel;
	role: ChannelRole;
	isMuted: boolean;
}

export type ChannelMemberPublic = {
	id: number;
	user: UserPublic;
	role: ChannelRole;
}

export type MutedUser = {
	userId: number;
	channelId: number;
	user: User;
	muteUntil: Date;
}

export interface Channel {
	id: number;
	image?: string;
	name: string;
	bannedUsers?: User[];
	mutedUsers?: MutedUser[];
	onlineMembers?: number;
	members: ChannelMemberPublic[];
	type: ChannelType;
	description: string;
}

export interface Invite {
	id: string;
	destination: Channel;
	isJoined?: boolean;
}

export const enum UpdateType {
	updated = 'updated',
	created = 'created',
	deleted = 'deleted',
}

export type DataUpdateType<Type>  = {
	id: number,
	content: Type,
	updateType: UpdateType,
}

