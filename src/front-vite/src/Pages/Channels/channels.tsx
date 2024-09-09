import axios from "axios";
import React, { useContext, useEffect, useState, createContext } from "react";
import { User, useUser } from "../../Providers/UserContext/User";

const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';

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

export type ChannelMember = {
	id: number;
	user: User;
	channel: Channel;
	muted: boolean;
	role: ChannelRole;
}

export interface Channel {
	id: number;
	image?: string;
	name: string;
	banList?: User[];
	members: ChannelMember[];
	type: ChannelType;
	description: string;
}

type ChannelContextType = {
	memberships: ChannelMember[],
	publicChannels: Channel[],
}

export const handleError = (message: string, error: any) => {
	const errorMessage = error.response.data ? error.response.data.message : error

	alert(`${message} ${errorMessage}`);
}

const RETRY_DELAY = 1000;

export const retryOperation = async (operation: () => Promise<any>, retries = 3): Promise<any> => {
	for (let attempt = 1;; ++attempt) {
		try {
			return (await operation());
		} catch (error) {
			if (attempt < retries) {
				console.warn(`Attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms...`);
				await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
			} else {
				throw error;
			}
		}
	}
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export const ChannelContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [memberships, setMemberships] = useState<ChannelMember[]>([]);
	const [publicChannels, setPublicChannels] = useState<Channel[]>([]);

	const { userSocket } = useUser();

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

		const onPublicChannelUpdate = (updatedChannel: Channel) => {
			const index = publicChannels.findIndex((channel) => channel.id === updatedChannel.id)
			if (index === -1) {
				setPublicChannels((prev) => [...prev, updatedChannel]);
			} else {
				const newChannels = [...publicChannels];
				newChannels[index] = updatedChannel;
				setPublicChannels(newChannels);
			}
		}

		getJoinedChannels();
		getPublicChannels();

		userSocket?.on('newChannelUpdate', onChannelUpdate);
		userSocket?.on('newPublicChannelUpdate', onPublicChannelUpdate);
		console.log('mounted');
		return () => {
			console.log('unmount');
			userSocket?.emit('unsubscribeChannel', -1);
			userSocket?.off('newChannelUpdate', onChannelUpdate);
			userSocket?.off('newPublicChannelUpdate', onPublicChannelUpdate);
		}
	}, [userSocket]);

	return (
		<ChannelContext.Provider value={{ memberships, publicChannels}}>
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
