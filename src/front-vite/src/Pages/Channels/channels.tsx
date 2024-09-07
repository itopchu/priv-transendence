import axios from "axios";
import React, { useContext, useEffect, useState, createContext } from "react";
import { User } from "../../Providers/UserContext/User";

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
	triggerRefresh: () => void,
	//setMemberships: React.Dispatch<React.SetStateAction<ChannelMember[]>>,
	//setPublicChannels: React.Dispatch<React.SetStateAction<Channel[]>>,
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export const ChannelContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [memberships, setMemberships] = useState<ChannelMember[]>([]);
	const [publicChannels, setPublicChannels] = useState<Channel[]>([]);
	const [refresh, setRefresh] = useState<boolean>(false);

	useEffect(() => {
		const getJoinedChannels = async () => {
			try {
				const response = await axios.get(`${BACKEND_URL}/channel/joined`, { withCredentials: true });
				if (response.data.memberships)
					setMemberships(response.data.memberships);
			} catch(error: any) {
				alert(error?.response?.data?.message);
			}
		};

		const getPublicChannels = async () => {
			try {
				const response = await axios.get(`${BACKEND_URL}/channel/public`, { withCredentials: true });
				if (response.data.channels)
					setPublicChannels(response.data.channels);
			} catch(error: any) {
				alert(error?.response?.data?.message);
			}
		};

		getJoinedChannels();
		getPublicChannels();
	}, [refresh]);

	const triggerRefresh = () => {
		setRefresh((prev) => !prev);
	};

	return (
		<ChannelContext.Provider value={{ memberships, publicChannels, triggerRefresh}}>
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
