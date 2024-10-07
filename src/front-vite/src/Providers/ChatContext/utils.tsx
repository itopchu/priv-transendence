import axios from "axios";
import { ChatProps, ChatStatus } from "../../Layout/Chat/InterfaceChat";
import { User } from "../UserContext/User";
import { BACKEND_URL, formatErrorMessage, handleError } from "../../Pages/Channels/utils";
import { Socket } from "socket.io-client";

export function findChat(receiverId: number, chatProps: ChatProps) {
	const chat = chatProps.chats.find((chat) => chat.user.id === receiverId);
	return (chat);
}

export async function handleChatInvite(
	user: User | undefined,
	chatProps: ChatProps,
	changeChatProps: (newProps: Partial<ChatProps>) => void,
	menuCloseFunc?: () => void,
) {
	if (!user) return;

	const chat = findChat(user.id, chatProps);
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

export async function sendGameInvite(
	receiverId: number | undefined,
	userSocket: Socket | null,
	chatProps: ChatProps,
	changeChatProps: (newProps: Partial<ChatProps>) => void,
	setErrorMessage?: (message: string) => void
) {
	if (!receiverId || !userSocket) return;
	console.log("inviteGame", receiverId);

	let chat = findChat(receiverId, chatProps);
	if (!chat) {
		try {
			const response = await axios.post(`${BACKEND_URL}/chat/${receiverId}`, null, { withCredentials: true});
			const newChat = response.data.chat;
			if (newChat) {
				changeChatProps({ chats: [newChat] });
				chat = newChat;
			}
		} catch (error) {
			if (setErrorMessage)
				setErrorMessage(formatErrorMessage('Could not send game invite:', error));
			else
				handleError('Could not send game invite:', error);
		}
	}

	userSocket?.emit("inviteGame", receiverId, (roomId: string) => {
		if (roomId.startsWith("GameRoom-")) {
			const payload = {
				receiverId,
				content: roomId,
			};
			userSocket?.emit("sendChatMessage", payload);
			if (chat && chatProps.selected?.id !== chat.id) {
				changeChatProps({ selected: chat, chatStatus: ChatStatus.Chatbox });
			}
		} else if (setErrorMessage) {
			setErrorMessage(roomId);
		} else handleError(roomId);
	});
}
