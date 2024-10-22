import React, { useContext, useEffect, useState, createContext } from "react";
import { ChatProps, ChatStatus, IChat } from "../../Layout/Chat/InterfaceChat";
import axios from "axios";
import { handleError } from "../../Pages/Channels/utils";
import { useUser } from "../UserContext/User";
import { BACKEND_URL } from "../UserContext/User";

type ChatContextType = {
	chatProps: ChatProps,
	changeChatProps: (newProps: Partial<ChatProps>) => void,
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userSocket } = useUser();
  const [chatProps, setChatProps] = useState<ChatProps>({
    chats: [],
    chatStatus: ChatStatus.Bubble,
    selected: undefined,
		loading: true,
  });

	const changeChatProps = (newProps: Partial<ChatProps>) => {
		const newChats = newProps.chats ? newProps.chats : [];

		setChatProps((prevProps) => ({
			...prevProps,
			...newProps,
			chats: [...prevProps.chats, ...newChats],
		}));
	}

	useEffect(() => {
		if (!user.id) return;
		changeChatProps({ loading: true });

		const getChats = async () => {
			try {
				const response = await axios.get(`${BACKEND_URL}/chat`, { withCredentials: true });
				const chats: IChat[] = response.data.chats;
				if (chats) {
					chats.sort((a, b) => new Date(a.modified).getTime() - new Date(b.modified).getTime());
					setChatProps((prevProps) => ({ ...prevProps, chats: response.data.chats || [] }));
				}
			} catch (error) {
				handleError('Could not get chats:', error);
			}
		}

		getChats();
		changeChatProps({ loading: false });
	}, [user.id]);

	useEffect(() => {
		const onNewChat = (newChat: IChat) => {
			changeChatProps({ chats: [newChat] });
		}

		userSocket?.on('newChat', onNewChat);
		return () => {
			userSocket?.off('newChat', onNewChat);
		}
	}, [userSocket]);

	return (
		<ChatContext.Provider value={{ chatProps, changeChatProps }}>
			{ children }
		</ChatContext.Provider>
	);
};

export const useChat = () => {
	const context = useContext(ChatContext);
	if (!context)
		throw new Error('useChat must be used within a ChatProvider');
	return (context);
}
