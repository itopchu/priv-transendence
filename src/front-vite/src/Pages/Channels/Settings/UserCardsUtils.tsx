import axios from "axios";
import { FriendshipAttitude, FriendshipAttitudeBehaviour } from "../../Profile/ownerInfo";
import { handleError, BACKEND_URL, getUsername } from "../utils";
import { User } from "../../../Providers/UserContext/User";
import { MenuItem } from "@mui/material";
import { useChat } from "../../../Providers/ChatContext/Chat";
import { ChatStatus } from "../../../Layout/Chat/InterfaceChat";

export async function getFriendshipAttitude(
	id: number,
	setFunc: React.Dispatch<React.SetStateAction<FriendshipAttitude>>,
) {
	try {
		const response = await axios.get(`${BACKEND_URL}/user/friendship/${id}`, { withCredentials: true });
		if (response.data.friendshipAttitude) {
			setFunc(response.data.friendshipAttitude);
		}
	} catch (error) {
		console.error(`Relationship not found:${error}`)
	}
}

export async function postStatus(
	id: number,
	setFunc: React.Dispatch<React.SetStateAction<FriendshipAttitude>>,
	type: FriendshipAttitudeBehaviour
) {
	try {
		const response = await axios.post(`${BACKEND_URL}/user/friendship/${id}`, { type }, { withCredentials: true });
		if (response.data.friendshipAttitude) {
			setFunc(response.data.friendshipAttitude);
		}
	} catch (error) {
		handleError("Could not update relationship:", error)
	}
}

export const userRelationMenuItems = (
	user: User,
	friendshipAttitude: FriendshipAttitude,
	setFunc: React.Dispatch<React.SetStateAction<FriendshipAttitude>>,
	menuCloseFunc: () => void,
) => {
	const username = getUsername(user);

	switch (friendshipAttitude) {
		case FriendshipAttitude.restricted:
			return (
				<MenuItem onClick={() => { postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.restore); menuCloseFunc(); }} >
					{`Unblock ${username}`}
				</MenuItem>
			);
		case FriendshipAttitude.accepted:
			return ([
				(<MenuItem onClick={() => { postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.remove); menuCloseFunc(); }}>
					{`Unfriend ${username}`}
				</MenuItem>),
				(<MenuItem onClick={() => { postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.restrict); menuCloseFunc(); }}>
					{`Block ${username}`}
				</MenuItem>),
			]);
		case FriendshipAttitude.pending:
			return ([
				(<MenuItem onClick={() => { postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.withdraw); menuCloseFunc(); }}>
					Withdraw Friend Request
				</MenuItem>),
				(<MenuItem onClick={() => { postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.restrict); menuCloseFunc(); }}>
					{`Block ${username}`}
				</MenuItem>),
			]);
		case FriendshipAttitude.awaiting:
			return ([
				(<MenuItem onClick={() => { postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.approve); menuCloseFunc(); }}>
					Accept Friend Request
				</MenuItem>),
				(<MenuItem onClick={() => { postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.decline); menuCloseFunc(); }}>
					Decline Friend Request
				</MenuItem>),
				(<MenuItem onClick={() => { postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.restrict); menuCloseFunc(); }}>
					{`Block ${username}`}
				</MenuItem>),
			]);
		default:
			return ([
				(<MenuItem onClick={() => { postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.add); menuCloseFunc(); }}>
					Send Friend Request
				</MenuItem>),
				(<MenuItem onClick={() => { postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.restrict); menuCloseFunc(); }}>
					{`Block ${username}`}
				</MenuItem>),
			]);
	}
}

export async function onSendMessage(user: User, menuCloseFunc: () => void) {
	const { chatProps, changeChatProps } = useChat();

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
		menuCloseFunc();
	} catch (error) {
		handleError('Could not create chat:', error);
	}
}
