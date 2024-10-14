import axios from "axios";
import React, { useContext, useEffect, useState, createContext } from "react";
import { useUser } from "../../Providers/UserContext/User";
import { BACKEND_URL, handleError } from "../../Pages/Channels/utils";
import {
	MemberClient,
	ChannelPropsType,
	ChannelPublic,
	DataUpdateType,
    UpdateType,
} from "./Types";
import {  retryOperation, updatePropArray } from "./utils";

export type ChannelContextType = {
	channelProps: ChannelPropsType,
	setChannelProps: React.Dispatch<React.SetStateAction<ChannelPropsType>>,
	changeProps: (newProps: Partial<ChannelPropsType>) => void,
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export const ChannelContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { user, userSocket } = useUser();

	const [channelProps, setChannelProps] = useState<ChannelPropsType>({
		memberships: [],
		selected: null,
		selectedJoin: null,
		state: undefined,
		loading: true,
	});

	const changeProps = (newProps: Partial<ChannelPropsType>) => {
		setChannelProps((prev) => ({
			...prev,
			...newProps,
		}))
	}

	useEffect(() => {
		if (!user.id) return;

		const getJoinedChannels = async () => {
			try {
				const memberships: MemberClient[] = await retryOperation(async () => {
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
			changeProps({ loading: false });
		};

		const onMembershipUpdate = (data: DataUpdateType<MemberClient>) => {
			setChannelProps((prevProps) => {
				const updatedMemberships = updatePropArray(prevProps.memberships, data);
				const updatedSelected = data.updateType !== UpdateType.deleted
					? prevProps.memberships.find((membership) => membership.id === data.content.id)
					: null;

				return ({
					...prevProps,
					memberships: updatedMemberships,
					selected: updatedSelected !== undefined ? updatedSelected : prevProps.selected,
				});
			});
		}

		const onChannelUpdate = (data: DataUpdateType<ChannelPublic>) => {
			if (data.updateType === UpdateType.created) return;

			setChannelProps((prevProps) => {
				const targetIndex = prevProps.memberships.findIndex((member) =>
					member.channel.id === data.id
				);
				if (targetIndex === -1) {
					return (prevProps);
				}

				const updatedMemberships = [...prevProps.memberships];
				const updatedSelected = updatedMemberships[targetIndex];
				if (data.updateType ===  UpdateType.deleted) {
					updatedMemberships.splice(targetIndex, 1);
				} else {
					const targetChannel = updatedMemberships[targetIndex].channel;
					updatedMemberships[targetIndex].channel = { ...targetChannel, ...data.content };
				}

				return ({
					...prevProps,
					memberships: updatedMemberships,
					selected: updatedSelected?.id === prevProps.selected?.id ? updatedSelected : prevProps.selected,
				});
			});
		}

		userSocket?.on('membershipUpdate', onMembershipUpdate);
		userSocket?.on('channelUpdate', onChannelUpdate);
		getJoinedChannels();
		return () => {
			changeProps({ loading: true });
			if (userSocket) {
				userSocket.emit('unsubscribeChannel', -1);
				userSocket.off('membershipUpdate', onChannelUpdate);
				userSocket.off('channelUpdate', onChannelUpdate);
			}
		}
	}, [user.id, userSocket]);

	return (
		<ChannelContext.Provider
			value={{
				channelProps,
				setChannelProps,
				changeProps,
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
