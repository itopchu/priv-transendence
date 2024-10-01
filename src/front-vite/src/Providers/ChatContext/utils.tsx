import axios from "axios";
import { ChatProps, ChatStatus } from "../../Layout/Chat/InterfaceChat";
import { User } from "../UserContext/User";
import { BACKEND_URL, handleError } from "../../Pages/Channels/utils";

export async function handleChatInvite(
	user: User | undefined,
	chatProps: ChatProps,
	changeChatProps: (newProps: Partial<ChatProps>) => void,
	menuCloseFunc?: () => void,
) {
	if (!user) return;

	const chat = chatProps.chats.find((chat) => chat.user.id === user.id);
	if (chat) {
		changeChatProps({
			selected: chat,
			chatStatus: ChatStatus.Chatbox,
		});
		return;
	}

	try {
		const response = await axios.post(`${BACKEND_URL}/chat/${user?.id}`, null, { withCredentials: true});
		const newChat = response.data.chat;
		if (newChat) {
			changeChatProps({
				chats: [newChat],
				selected: newChat,
				chatStatus: ChatStatus.Chatbox,
			});
		}
		if (menuCloseFunc) {
			menuCloseFunc();
		}
	} catch (error) {
		handleError('Could not create chat:', error);
	}
}
