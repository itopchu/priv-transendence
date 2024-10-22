import axios from "axios";
import { FriendshipAttitude, FriendshipAttitudeBehaviour } from "../../Profile/ownerInfo";
import { handleError, getUsername } from "../utils";
import { User } from "../../../Providers/UserContext/User";
import { MenuItem } from "@mui/material";
import { useEffect } from "react";
import { BACKEND_URL } from "../../../Providers/UserContext/User";

export async function getFriendshipAttitude(
	id: number,
	setFunc: React.Dispatch<React.SetStateAction<FriendshipAttitude>>,
	controller: AbortController,
) {
	try {
		const response = await axios.get(`${BACKEND_URL}/user/friendship/${id}`, {
				withCredentials: true,
				signal: controller.signal,
			}
		);
		if (response.data.friendshipAttitude) {
			setFunc(response.data.friendshipAttitude);
		}
	} catch (error) {
		if (!axios.isCancel(error)) {
			console.error(`Relationship not found:${error}`)
		}
	}
}

export const useFriendshipAttitude = (
	id: number | null,
	setFunc: React.Dispatch<React.SetStateAction<FriendshipAttitude>>,
) => {
	useEffect(() => {
		if (!id) return;

		const controller = new AbortController();
		getFriendshipAttitude(id, setFunc, controller);

		return () => {
			controller.abort;
		};
	}, [id]);
};

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
				<MenuItem
					onClick={() => {
						postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.restore);
						menuCloseFunc();
					}}
				>
					{`Unblock ${username}`}
				</MenuItem>
			);
		case FriendshipAttitude.accepted:
			return ([
				(<MenuItem
					key={FriendshipAttitudeBehaviour.remove}
					onClick={() => {
						postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.remove);
						menuCloseFunc();
					}}
				>
					Remove friend
				</MenuItem>),
			]);
		case FriendshipAttitude.pending:
			return ([
				(<MenuItem
					key={FriendshipAttitudeBehaviour.withdraw}
					onClick={() => {
						postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.withdraw);
						menuCloseFunc();
					}}
				>
					Withdraw Friend Request
				</MenuItem>),
			]);
		case FriendshipAttitude.awaiting:
			return ([
				(<MenuItem
					key={FriendshipAttitudeBehaviour.approve}
					onClick={() => {
						postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.approve);
						menuCloseFunc();
					}}
				>
					Accept Friend Request
				</MenuItem>),
				(<MenuItem
					key={FriendshipAttitudeBehaviour.decline}
					onClick={() => {
						postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.decline);
						menuCloseFunc();
					}}
				>
					Decline Friend Request
				</MenuItem>),
			]);
		default:
			return ([
				(<MenuItem
					key={FriendshipAttitudeBehaviour.add}
					onClick={() => {
						postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.add);
						menuCloseFunc();
					}}
				>
					Send Friend Request
				</MenuItem>),
				(<MenuItem
					key={FriendshipAttitudeBehaviour.restrict}
					onClick={() => {
						postStatus(user.id, setFunc, FriendshipAttitudeBehaviour.restrict);
						menuCloseFunc();
					}}
				>
					{`Block ${username}`}
				</MenuItem>),
			]);
	}
}
