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
	channels: ChannelBase[],
	hidden: boolean,
	loading: boolean,
}

export type ChannelPropsType = {
	memberships: MemberClient[],
	selected: MemberClient | null,
	selectedJoin: ChannelBase | null,
	state: ChannelStates | undefined,
	loading: boolean,
}

export interface MemberBase {
	id: number;
	role: ChannelRole;
}

export interface MemberPublic extends MemberBase {
	user: UserPublic;
	isMuted?: boolean;
}

export interface MemberClient extends MemberPublic {
	user: User;
	channel: ChannelBase;
}

export type MutedUser = {
	userId: number;
	channelId: number;
	user: User;
	muteUntil: Date;
}

export interface ChannelBase {
	id: number;
	image?: string;
	name: string;
	type: ChannelType;
	description: string;
	memberCount?: number;
}

export interface ChannelPublic extends ChannelBase {
	isBanned?: boolean;
	isJoined?: boolean;
}

export interface Invite {
	id: string;
	destination: ChannelPublic;
	isJoined?: boolean;
}

export const enum UpdateType {
	updated = 'updated',
	created = 'created',
	deleted = 'deleted',
}

export type PartialWithId<IdType, Type extends { id: IdType }> = Partial<Type> & { id: IdType };

export type DataUpdateType<Type extends { id: number }>  = {
	id: number,
	content: PartialWithId<number, Type>,
	updateType: UpdateType,
}

