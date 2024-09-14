import React, { useContext, useEffect, useState, createContext } from "react";
import { ChatProps, ChatStatus } from "../../Layout/Chat/InterfaceChat";

type ChatContextType = {
	chatProps: ChatProps,
	changeChatProps: (newProps: Partial<ChatProps>) => void,
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chatProps, setChatProps] = useState<ChatProps>({
    chatRooms: [],
    chatStatus: ChatStatus.Bubble,
    selected: null,
    searchPrompt: null,
  });

	useEffect(() => {
	}, []);

	const changeChatProps = (newProps: Partial<ChatProps>) => {
		setChatProps((prevProps) => ({
			...prevProps,
			...newProps,
		}));
	}

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
