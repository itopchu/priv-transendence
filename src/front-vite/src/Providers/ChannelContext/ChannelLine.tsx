import React, { useContext, useEffect, useState, createContext } from "react";
import { useUser } from "../../Providers/UserContext/User";
import {
	ChannelBase,
	ChannelFilters,
	ChannelLinePropsType,
	DataUpdateType,
	UpdateType,
} from "./Types";
import { getChannelTypeFromFilter, updatePropArray } from "./utils";
import { useMediaQuery, useTheme } from "@mui/material";
import { useChannel } from "./Channel";

export type ChannelLineContextType = {
	channelLineProps: ChannelLinePropsType,
	setChannelLineProps: React.Dispatch<React.SetStateAction<ChannelLinePropsType>>,
	changeLineProps: (newProps: Partial<ChannelLinePropsType>) => void,
}

const ChannelLineContext = createContext<ChannelLineContextType | undefined>(undefined);

export const ChannelLineContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const theme = useTheme();
	const { userSocket } = useUser();
	const { channelProps, changeProps } = useChannel();
	const isTinyScreen = useMediaQuery(theme.breakpoints.down('sm'));

	const [channelLineProps, setChannelLineProps] = useState<ChannelLinePropsType>({
		channels: channelProps.memberships.map((membership) => membership.channel),
		filter: ChannelFilters.myChannels,
		hidden: false,
		loading: false,
	})

	const changeLineProps = (newProps: Partial<ChannelLinePropsType>) => {
		setChannelLineProps((prev)  => ({
			...prev,
			... newProps,
		}))
	}

	useEffect(() => {
		if (channelLineProps.filter === ChannelFilters.myChannels) return;

		const onPublicChannelUpdate = (data: DataUpdateType<ChannelBase>) => {
			if (data.content?.type !== getChannelTypeFromFilter(channelLineProps.filter)
					&& !channelLineProps.channels.some((channel) => channel.id === data.content.id)) {
				return;
			}

			if (data.content.id === channelProps.selectedJoin?.id
					&& data.updateType === UpdateType.deleted) {
					changeProps({ selectedJoin: null });
			}
			setChannelLineProps((prevProps) => ({
				...prevProps,
				channels: updatePropArray(prevProps.channels, data),
			}));
		}

		userSocket?.on('publicChannelUpdate',  onPublicChannelUpdate);
		userSocket?.emit('subscribePublicChannel');
		return () => {
			userSocket?.emit('unsubscribePublicChannel');
			userSocket?.off('publicChannelUpdate');
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
		<ChannelLineContext.Provider
			value={{
				channelLineProps,
				setChannelLineProps,
				changeLineProps,
			}}
		>
			{ children }
		</ChannelLineContext.Provider>
	);
};

export const useChannelLine = () => {
	const context = useContext(ChannelLineContext);
	if (!context)
		throw new Error('useChannelLine must be used within a ChannelLineProvider');
	return (context);
}
