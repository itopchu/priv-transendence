import axios from "axios";
import React, { useContext, useEffect, useState, createContext } from "react";
import { User, useUser } from "../../Providers/UserContext/User";
import { BACKEND_URL, handleError, retryOperation } from "../../Pages/Channels/utils";

export enum ChannelType {
	private = 'private',
	protected = 'protected',
	public = 'public',
}

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

export type ChannelPropsType = {
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
	members: ChannelMember[];
	type: ChannelType;
	description: string;
}

const enum UpdateType {
	updated = 'updated',
	deleted = 'deleted',
	created = 'created',
}

type DataUpdateType  = {
	channelId: number,
	content: Channel | ChannelMember,
	updateType: UpdateType,
}

type ChannelContextType = {
	memberships: ChannelMember[],
	publicChannels: Channel[],
	channelProps: ChannelPropsType,
	setChannelProps: React.Dispatch<React.SetStateAction<ChannelPropsType>>,
	changeProps: (newProps: Partial<ChannelPropsType>) => void,
}

function updateArray<Type>(prevArray: Type[], newData: DataUpdateType): Type[] {
	const index = prevArray.findIndex((prevArray: any) => prevArray.id === newData.content.id)
	if (index === -1) {
		if (newData.updateType === UpdateType.updated) {
			return ([...prevArray, newData.content as Type]);
		}
		return ([...prevArray]);
	}

	let updatedArray = [...prevArray];
	if (newData.updateType === UpdateType.updated) {
		updatedArray[index] = newData.content as Type;
	} else {
		updatedArray.splice(index, 1);
	}
	return (updatedArray);
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export const ChannelContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [memberships, setMemberships] = useState<ChannelMember[]>([]);
	const [publicChannels, setPublicChannels] = useState<Channel[]>([]);
  const [channelProps, setChannelProps] = useState<ChannelPropsType>({
		selected: undefined,
		selectedJoin: undefined,
		state: undefined,
	});

	const { userSocket } = useUser();

  const changeProps = (newProps: Partial<ChannelPropsType>) => {
	  setChannelProps((prev) => ({
		  ...prev,
		  ...newProps,
	  }))
  }

	useEffect(() => {
		const getJoinedChannels = async () => {
			try {
				const memberships: ChannelMember[] = await retryOperation(async () => {
					const response = await axios.get(`${BACKEND_URL}/channel/joined`, { withCredentials: true });
					return (response.data.memberships || []);
				})
				setMemberships(memberships);
				memberships.forEach((member) => (
					userSocket?.emit('subscribeChannel', member.channel.id)
				));
			} catch(error: any) {
				handleError('Unable to get joined channels:',  error);
			}
		};

		const getPublicChannels = async () => {
			try {
				const channels: Channel[] = await retryOperation(async () => {
					const response = await axios.get(`${BACKEND_URL}/channel/public`, { withCredentials: true });
					return (response.data.channels || []);
				})
				setPublicChannels(channels);
				userSocket?.emit('subscribePublicChannel');
			} catch(error: any) {
				handleError('Unable to get public channels:',  error);
			}
		};

		async function updateMemberships(data: DataUpdateType) {
			try {
				const membership: ChannelMember | null = await retryOperation(async () => {
					const response = await axios.get(`${BACKEND_URL}/channel/joined/${data.channelId}`, {
						withCredentials: true
					});
					return (response.data.membership);
				})
				if (!membership) return;

				data.content = membership;
				setMemberships((prevMemberships) => updateArray(prevMemberships, data));
				setChannelProps((prevProps) => {
					if (prevProps?.selected?.id === membership.id) {
						return ({ ...prevProps, selected: membership });
					}
					return (prevProps);
				});
			} catch (error: any) {
				handleError('Unable to update joined channel:',  error);
			}
		}

		const onChannelUpdate = (data: DataUpdateType) => {
			if (data.updateType === UpdateType.updated) {
				updateMemberships(data);
			} else {
				setMemberships((prevMemberships) => {
					const deletedMembership = prevMemberships.find((membership) => membership.channel.id === data.channelId);
					if (!deletedMembership) {
						return (prevMemberships);
					}
					data.content = deletedMembership;
					return (updateArray(prevMemberships, data));
				});
				setChannelProps((prevProps) => {
					if (prevProps?.selected?.channel.id === data.channelId) {
						return ({ ...prevProps, selected: undefined, state: undefined });
					}
					return (prevProps);
				});
			}
		}

		const onPublicChannelUpdate = (data: DataUpdateType) => {
			setPublicChannels((prevChannels) => (updateArray(prevChannels, data)));
		}

		getJoinedChannels();
		getPublicChannels();

		userSocket?.on('newChannelUpdate', onChannelUpdate);
		userSocket?.on('newPublicChannelUpdate', onPublicChannelUpdate);
		return () => {
			userSocket?.emit('unsubscribeChannel', -1);
			userSocket?.off('newChannelUpdate', onChannelUpdate);
			userSocket?.off('newPublicChannelUpdate', onPublicChannelUpdate);
		}
	}, [userSocket]);

	return (
		<ChannelContext.Provider value={{ memberships, publicChannels, channelProps, setChannelProps, changeProps }}>
			{ children }
		</ChannelContext.Provider>
	);
};

export const useChannel = () => {
	const context = useContext(ChannelContext);
	if (!context)
		throw new Error('useChannel must be used within a ChannelProvider');
	return (context);
}
