import React, { useContext, useEffect, useState, createContext } from "react";
import { ChatProps, ChatStatus, Chat, Message } from "../../Layout/Chat/InterfaceChat";
import axios from "axios";
import { BACKEND_URL, handleError } from "../../Pages/Channels/utils";
import { useUser } from "../UserContext/User";

type DirectMessageDataType = {
	chatId: number,
	message: Message,
}

type ChatContextType = {
	chatProps: ChatProps,
	changeChatProps: (newProps: Partial<ChatProps>) => void,
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userSocket } = useUser();
  const [chatProps, setChatProps] = useState<ChatProps>({
    chats: [],
    chatStatus: ChatStatus.Bubble,
		messages: [],
    selected: undefined,
    searchPrompt: undefined,
  });

	const changeChatProps = (newProps: Partial<ChatProps>) => {
		const newChats = newProps.chats ? newProps.chats : [];
		const newMessages = newProps.messages ? newProps.messages : [];

		if (newProps.selected) {
			newProps.selected.unreadMsgCount = 0;
		}

		console.log(newProps);
		setChatProps((prevProps) => ({
			...prevProps,
			...newProps,
			chats: [...prevProps.chats, ...newChats],
			messages: newMessages,
		}));
	}

	useEffect(() => {
		const getChats = async () => {
			try {
				const response = await axios.get(`${BACKEND_URL}/chat`, { withCredentials: true });
				setChatProps((prevProps) => ({ ...prevProps, chats: response.data.chats || [] }));
			} catch (error) {
				handleError('Could not get chats:', error);
			}
		}

		getChats();
	}, []);

	useEffect(() => {
		if (!chatProps.selected) return;

		const getMessages = async () => {
			if (!chatProps.selected) return;

			try {
				const response = await axios.get(`${BACKEND_URL}/chat/messages/${chatProps.selected.id}`, { withCredentials: true });
				changeChatProps({ messages: response.data.messages });
			} catch (error) {
				handleError('Could not get chats:', error);
			}
		}

		getMessages();
	}, [chatProps.selected?.id]);

	useEffect(() => {
		const onNewChat = (newChat: Chat) => {
			changeChatProps({ chats: [newChat] });
		}

		const onDirectMessage = (data: DirectMessageDataType) => {
			setChatProps((prevProps) => {
				if (data.chatId === prevProps.selected?.id) {
					return ({ ...prevProps, messages: [...prevProps.messages, data.message] });
				} else {
					const index = prevProps.chats.findIndex((chat) => chat.id === data.chatId);
					if (!index) return (prevProps);

					let updatedChats = [...prevProps.chats];
					updatedChats[index].unreadMsgCount = updatedChats[index].unreadMsgCount
						? updatedChats[index].unreadMsgCount + 1
						: 1;
					return ({ ...prevProps, chats: updatedChats });
				}
			})
		}

		userSocket?.on('newChat', onNewChat);
		userSocket?.on('directMessage', onDirectMessage);
		return () => {
			userSocket?.off('newChat');
			userSocket?.off('directMessage');
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
