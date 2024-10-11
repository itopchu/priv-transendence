import React, { useState } from "react";
import { BarCard } from "../Components/CardComponents";
import { User } from "../../../Providers/UserContext/User";
import { Box, Divider, IconButton, Menu, MenuItem, Stack, Theme, Typography } from "@mui/material";
import { ButtonAvatar, ClickTypography } from "../Components/Components";
import { MoreVert as UserMenuIcon } from '@mui/icons-material';
import { useNavigate } from "react-router-dom";
import { getUsername } from "../utils";
import { onModerate } from "./MemberCards";
import { useFriendshipAttitude, userRelationMenuItems } from "./UserCardsUtils";
import { FriendshipAttitude } from "../../Profile/ownerInfo";
import { useChat } from "../../../Providers/ChatContext/Chat";
import { handleChatInvite } from "../../../Providers/ChatContext/utils";

type BannedUserCardsType = {
	users: User[],
	channelId: number,
}

export const BannedUserCards: React.FC<BannedUserCardsType> = ({ users, channelId }) => {
	if (!users?.length) return (null);

  const navigate = useNavigate();
	const { chatProps, changeChatProps } = useChat();

	const [menuId, setMenuId] = useState<number | null>(null);
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [friendshipAttitude, setFriendshipAttitude] = useState<FriendshipAttitude>(FriendshipAttitude.available);

	useFriendshipAttitude(menuId, setFriendshipAttitude);

	const onMenuClick = (event: React.MouseEvent<HTMLElement>, menuId: number) => {
		setAnchorEl(event.currentTarget);
		setMenuId(menuId);
	};

	const onMenuClose = () => {
		setAnchorEl(null);
		setMenuId(null);
	};

	return (
		<>
			{users.map((user) => {
				const username = getUsername(user);

				return (
					<BarCard key={user.id} >
						<ButtonAvatar
							src={user?.image}
							clickEvent={() => {
								navigate(`/profile/${user.id}`);
							}}
							avatarSx={{
								width: 56,
								height: 56,
								border: 0,
							}}
							sx={{
								marginRight: 2,
								boxShadow: (theme: Theme) => theme.shadows[5],
							}}
						/>
					
						<Stack>
							<ClickTypography
								variant="h3"
								fontSize="1.1em"
								fontWeight="bold"
								onClick={() => {
									navigate(`/profile/${user.id}`);
								}}
							>
								{username}
							</ClickTypography>
							<Box
								maxHeight="3.6em"
								maxWidth="31em"
								overflow="hidden"
								textOverflow="ellipsis"
							>
								<Typography
									variant="body1"
									color="textSecondary"
									sx={{
										display: '-webkit-box',
										WebkitLineClamp: 2,
										WebkitBoxOrient: 'vertical',
									}}
								>
									{user.greeting}
								</Typography>
							</Box>
						</Stack>

						<Box sx={{ marginLeft: 'auto' }}>
							<IconButton onClick={(event) => onMenuClick(event, user.id)}>
								<UserMenuIcon />
							</IconButton>
							<Menu
								anchorEl={anchorEl}
								open={Boolean(anchorEl) && user.id === menuId}
								onClose={onMenuClose}
							>
								<MenuItem onClick={() => handleChatInvite(user, chatProps, changeChatProps, onMenuClose)}>
									Send Message
								</MenuItem>
								{userRelationMenuItems(user, friendshipAttitude, setFriendshipAttitude, onMenuClose)}
								<Divider />
								<MenuItem color='error' onClick={() => onModerate(user, 'ban', channelId, onMenuClose)}>
									{`Unban ${username}`}
								</MenuItem>
							</Menu>
						</Box>
					</BarCard>
				);
			})}
		</>
	);
}
