import React, { useEffect, useState } from "react";
import { BarCard } from "../Components/CardComponents";
import { User } from "../../../Providers/UserContext/User";
import { Box, Divider, IconButton, Menu, MenuItem, Stack, Theme, Typography } from "@mui/material";
import { ButtonAvatar, ClickTypography } from "../Components/Components";
import { MoreVert as UserMenuIcon } from '@mui/icons-material';
import { useNavigate } from "react-router-dom";
import { getUsername } from "../utils";
import { onModerate } from "./MemberCards";
import { getFriendshipAttitude, onSendMessage, userRelationMenuItems } from "./UserCardsUtils";
import { FriendshipAttitude } from "../../Profile/ownerInfo";

type BannedUserCardsType = {
	users: User[],
	channelId: number,
}

export const BannedUserCards: React.FC<BannedUserCardsType> = ({ users, channelId }) => {
	if (!users?.length) return (undefined);

  const navigate = useNavigate();

	const UserCard: React.FC<{ user: User }> = ({ user }) => {
		const [anchorEl, setAnchorEl] = useState<any>(null);
		const [friendshipAttitude, setFriendshipAttitude] = useState<FriendshipAttitude>(FriendshipAttitude.available);

		const username = getUsername(user);

		useEffect(() => {
			getFriendshipAttitude(user.id, setFriendshipAttitude);
		}, []);

		const onMenuClick = (event: any) => {
			setAnchorEl(event.currentTarget);
		};

		const onMenuClose = () => {
			setAnchorEl(null);
		};

		return (
			<BarCard>
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
					<IconButton onClick={onMenuClick}>
						<UserMenuIcon />
					</IconButton>
					<Menu
						anchorEl={anchorEl}
						open={Boolean(anchorEl)}
						onClose={onMenuClose}
					>
						<MenuItem onClick={() => onSendMessage(user, onMenuClose)}>Send Message</MenuItem>
						{userRelationMenuItems(user, friendshipAttitude, setFriendshipAttitude, onMenuClose)}
						<Divider />
						<MenuItem color='error' onClick={() => onModerate(user, 'ban', channelId, onMenuClose)}>
							{`Unban ${username}`}
						</MenuItem>
					</Menu>
				</Box>
			</BarCard>
		);
	}
	
	return (
		<>
			{users.map((user) => {
				<UserCard user={user} />
			})};
		</>
	);
}
