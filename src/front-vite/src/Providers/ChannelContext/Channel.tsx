import axios from "axios";
import React, { useContext, useEffect, useState, createContext } from "react";
import { useUser } from "../../Providers/UserContext/User";
import { BACKEND_URL, handleError } from "../../Pages/Channels/utils";
import {
    Channel,
	ChannelFilters,
	ChannelLinePropsType,
	ChannelMember,
	ChannelPropsType,
	DataUpdateType,
	UpdateType
} from "./Types";
import { getChannelTypeFromFilter, updatePropArray,  retryOperation } from "./utils";
import { useMediaQuery, useTheme } from "@mui/material";

export type ChannelContextType = {
	channelProps: ChannelPropsType,
	channelLineProps: ChannelLinePropsType,
	setChannelProps: React.Dispatch<React.SetStateAction<ChannelPropsType>>,
	setChannelLineProps: React.Dispatch<React.SetStateAction<ChannelLinePropsType>>,
	changeProps: (newProps: Partial<ChannelPropsType>) => void,
	changeLineProps: (newProps: Partial<ChannelLinePropsType>) => void,
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export const ChannelContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [channelProps, setChannelProps] = useState<ChannelPropsType>({
		memberships: [],
		selected: undefined,
		selectedJoin: undefined,
		state: undefined,
	});
	const [channelLineProps, setChannelLineProps] = useState<ChannelLinePropsType>({
		channels: [],
		filter: ChannelFilters.myChannels,
		hidden: false,
		loading: true,
	})

	const theme = useTheme();
	const { userSocket } = useUser();
	const isTinyScreen = useMediaQuery(theme.breakpoints.down('sm'));

	const changeLineProps = (newProps: Partial<ChannelLinePropsType>) => {
		setChannelLineProps((prev)  => ({
			...prev,
			... newProps,
		}))
	}

  const changeProps = (newProps: Partial<ChannelPropsType>) => {
		if (isTinyScreen && newProps.selected && !channelLineProps.hidden) {
			changeLineProps({ hidden: true });
		}
		
	  setChannelProps((prev) => ({
		  ...prev,
		  ...newProps,
	  }))
  }

	useEffect(() => {
		const getJoinedChannels = async () => {
			changeLineProps({ loading: true });
			try {
				const memberships: ChannelMember[] = await retryOperation(async () => {
					const response = await axios.get(`${BACKEND_URL}/channel/joined`, { withCredentials: true });
					return (response.data.memberships || []);
				})
				changeProps({ memberships });
				memberships.forEach((member) => (
					userSocket?.emit('subscribeChannel', member.channel.id)
				));
			} catch(error: any) {
				handleError('Unable to get joined channels:',  error);
			}
			changeLineProps({ loading: false });
		};

		async function updateMemberships(data: DataUpdateType<ChannelMember>) {
			try {
				const membership: ChannelMember | null = await retryOperation(async () => {
					const response = await axios.get(`${BACKEND_URL}/channel/joined/${data.id}`, {
						withCredentials: true
					});
					return (response.data.membership);
				})
				if (!membership) return;

				data.content = membership;
				setChannelProps((prevProps) => ({
					...prevProps,
					memberships: updatePropArray(prevProps.memberships, data),
					selected: prevProps.selected?.id === data.content.id ? data.content : prevProps.selected,
				}));
			} catch (error: any) {
				handleError('Unable to update joined channel:',  error);
			}
		}

		const onChannelUpdate = (data: DataUpdateType<ChannelMember>) => {
			if (data.updateType === UpdateType.updated) {
				updateMemberships(data);
			} else {
				setChannelProps((prevProps) => {
					const deletedMembership = prevProps.memberships.find((membership) => membership.channel.id === data.id);
					if (!deletedMembership) {
						return (prevProps);
					}
					data.content = deletedMembership;
					return ({
						...prevProps,
						memberships: updatePropArray(prevProps.memberships, data),
						selected: prevProps.selected?.id === deletedMembership.id ? undefined : prevProps.selected,
					});
				});
			}
		}

		const onMemberCountUpdate = (data: DataUpdateType<number>) => {
			setChannelProps((prevProps) => {
				const targetIndex = prevProps.memberships.findIndex((membership) => membership.channel.id === data.id);
				if (targetIndex === -1) {
					return (prevProps);
				}
				const updatedMemberships = [...prevProps.memberships];
				updatedMemberships[targetIndex].channel.onlineMembers = data.content;
				const targetMembership = updatedMemberships[targetIndex];
				return ({
					...prevProps,
					memberships: updatedMemberships,
					selected: prevProps.selected?.id === targetMembership.id ? targetMembership : prevProps.selected,
				});
			})
		}

		userSocket?.on('newChannelUpdate', onChannelUpdate);
		userSocket?.on('onlineMembersCount', onMemberCountUpdate);
		getJoinedChannels();
		return () => {
			userSocket?.emit('unsubscribeChannel', -1);
			userSocket?.off('newChannelUpdate', onChannelUpdate);
		}
	}, [userSocket]);

	useEffect(() => {
		if (channelLineProps.filter === ChannelFilters.myChannels) return;

		const onPublicChannelUpdate = (data: DataUpdateType<Channel>) => {
			if (data.content?.type !== getChannelTypeFromFilter(channelLineProps.filter)) {
				return;
			}

			setChannelLineProps((prevProps) => ({
				...prevProps,
				channels: updatePropArray(prevProps.channels, data),
			}));
		}

		userSocket?.on('newPublicChannelUpdate',  onPublicChannelUpdate);
		userSocket?.emit('subscribePublicChannel');
		return () => {
			userSocket?.emit('unsubscribePublicChannel');
			userSocket?.off('newPublicChannelUpdate');
		}
	}, [channelLineProps.filter, userSocket]);

	useEffect(() => {
		if (channelLineProps.filter !== ChannelFilters.myChannels) return;

		changeLineProps({ channels: channelProps.memberships.map((membership) => membership.channel)});
	}, [channelProps.memberships]);

	useEffect(() => {
		if (!isTinyScreen || !channelProps.selected) return;

		changeLineProps({ hidden: true });
	}, [isTinyScreen]);

	return (
		<ChannelContext.Provider
			value={{
				channelProps,
				channelLineProps,
				setChannelProps,
				setChannelLineProps,
				changeProps,
				changeLineProps,
			}}
		>
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
