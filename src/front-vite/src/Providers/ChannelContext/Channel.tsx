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
	editMode = 'editMode',
}

export type ChannelPropsType = {
	selected: Channel | undefined,
	selectedJoin: Channel | undefined,
	state: ChannelStates | undefined,
}

export type ChannelMember = {
	id: number;
	user: User;
	channel: Channel;
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
	members: ChannelMember[];
	type: ChannelType;
	description: string;
}

type ChannelUpdateType  = {
	channel: Channel,
	updateType: 'updated' | 'deleted',
}

type ChannelContextType = {
	memberships: ChannelMember[],
	publicChannels: Channel[],
	channelProps: ChannelPropsType,
	setChannelProps: React.Dispatch<React.SetStateAction<ChannelPropsType>>,
	changeProps: (newProps: Partial<ChannelPropsType>) => void,
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

		const onChannelUpdate = async () => {
			try {
				const memberships: ChannelMember[] = await retryOperation(async () => {
					const response = await axios.get(`${BACKEND_URL}/channel/joined`, { withCredentials: true });
					return (response.data.memberships || []);
				})
				setMemberships(memberships);
			} catch(error: any) {
				handleError('Unable to update joined channel:',  error);
				return;
			}
		}

		const onPublicChannelUpdate = (data: ChannelUpdateType) => {
			setPublicChannels((prevChannels) => {
				const index = prevChannels.findIndex(prevChannel => prevChannel.id === data.channel.id)

				if (index === -1) {
					if (data.updateType === 'updated') {
						return ([...prevChannels, data.channel]);
					}
					return ([...prevChannels]);
				}

				let updatedChannels = [...prevChannels];
				if (data.updateType === 'updated') {
					updatedChannels[index] = data.channel;
				} else {
					updatedChannels.splice(index, 1);
				}
				return (updatedChannels);
			});
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
