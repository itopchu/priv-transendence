import axios from "axios";
import React, { useContext, useEffect, useState, createContext } from "react";
import { useUser } from "../../Providers/UserContext/User";
import { handleError } from "../../Pages/Channels/utils";
import {
	MemberClient,
	ChannelPropsType,
	ChannelPublic,
	DataUpdateType,
	UpdateType,
} from "./Types";
import {  retryOperation, updatePropArray } from "./utils";
import { BACKEND_URL } from "../../Providers/UserContext/User";

export type ChannelContextType = {
	channelProps: ChannelPropsType,
	setChannelProps: React.Dispatch<React.SetStateAction<ChannelPropsType>>,
	changeProps: (newProps: Partial<ChannelPropsType>) => void,
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

function updateMembershipChannel(
	memberships: MemberClient[],
	data: DataUpdateType<ChannelPublic>
) {
	const targetIndex = memberships.findIndex((member) =>
		member.channel.id === data.id
	);
	if (targetIndex === -1) {
		return ({ memberships, target: null });
	}
	
	const updatedMemberships = [...memberships];
	if (data.updateType ===  UpdateType.deleted) {
		updatedMemberships.splice(targetIndex, 1);
	} else {
		const targetChannel = updatedMemberships[targetIndex].channel;
		updatedMemberships[targetIndex].channel = { ...targetChannel, ...data.content };
	}

	return ({ memberships: updatedMemberships, target: updatedMemberships[targetIndex] });
}

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
				const updatedTarget = updatedMemberships.find((membership) => membership.id === data.content.id);

				const isTargetSelected = data?.id === prevProps.selected?.id;
				const isDeleted = data.updateType === UpdateType.deleted;

				const updatedSelected = isTargetSelected
				  ? (isDeleted || !updatedTarget ? null : updatedTarget)
				  : prevProps.selected;

				return ({
					...prevProps,
					memberships: updatedMemberships,
					selected: updatedSelected,
				});
			});
		}

		const onChannelUpdate = (data: DataUpdateType<ChannelPublic>) => {
			if (data.updateType === UpdateType.created) return;

			setChannelProps((prevProps) => {
				const updatedProps = updateMembershipChannel(prevProps.memberships, data);

				const isTargetSelected = updatedProps.target?.id === prevProps.selected?.id;
				const isDeleted = data.updateType === UpdateType.deleted;

				const updatedSelected = isTargetSelected
				  ? (isDeleted ? null : updatedProps.target)
				  : prevProps.selected;

				return ({
					...prevProps,
					memberships: updatedProps.memberships,
					selected: updatedSelected,
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
				userSocket.off('membershipUpdate', onMembershipUpdate);
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
