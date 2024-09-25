import axios from "axios";
import React, { useContext, useEffect, useState, createContext } from "react";
import { useUser } from "../../Providers/UserContext/User";
import { BACKEND_URL, handleError, retryOperation } from "../../Pages/Channels/utils";
import {
	ChannelFilters,
	ChannelLinePropsType,
	ChannelMember,
	ChannelPropsType,
	DataUpdateType,
	UpdateType
} from "./Types";
import { getChannelTypeFromFilter, UpdatePropArray } from "./utils";
import { useMediaQuery, useTheme } from "@mui/material";

type ChannelContextType = {
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

	const	theme = useTheme();
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
				setChannelProps((prevProps) => ({
					...prevProps,
					memberships: UpdatePropArray(prevProps.memberships, data),
					selected: prevProps.selected
						? prevProps.selected.id === membership.id
							? membership : prevProps.selected
						: membership,
				}));
			} catch (error: any) {
				handleError('Unable to update joined channel:',  error);
			}
		}

		const onChannelUpdate = (data: DataUpdateType) => {
			if (data.updateType === UpdateType.updated) {
				updateMemberships(data);
			} else {
				setChannelProps((prevProps) => {
					const deletedMembership = prevProps.memberships.find((membership) => membership.channel.id === data.channelId);
					if (!deletedMembership) {
						return (prevProps);
					}
					data.content = deletedMembership;
					return ({
						...prevProps,
						memberships: UpdatePropArray(prevProps.memberships, data),
						selected: prevProps.selected?.id === deletedMembership.id ? undefined : prevProps.selected,
					});
				});
			}
		}

		const onMemberCountUpdate = (data: DataUpdateType) => {
			setChannelProps((prevProps) => {
				const targetIndex = prevProps.memberships.findIndex((membership) => membership.channel.id === data.channelId);
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

		getJoinedChannels();

		userSocket?.on('newChannelUpdate', onChannelUpdate);
		userSocket?.on('onlineMembersCount', onMemberCountUpdate);
		return () => {
			userSocket?.emit('unsubscribeChannel', -1);
			userSocket?.off('newChannelUpdate', onChannelUpdate);
		}
	}, [userSocket]);

	useEffect(() => {
		const onPublicChannelUpdate = (data: DataUpdateType) => {
			if ('type' in data.content
				&& data.content?.type !== getChannelTypeFromFilter(channelLineProps.filter)) {
				return;
			}

			setChannelLineProps((prevProps) => ({
				...prevProps,
				channels: UpdatePropArray(prevProps.channels, data),
			}));
		}

		if (channelLineProps.filter !== ChannelFilters.myChannels) {
			userSocket?.on('newPublicChannelUpdate',  onPublicChannelUpdate);
			userSocket?.emit('subscribePublicChannel');
		}

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
