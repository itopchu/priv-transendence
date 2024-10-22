import {
	Box,
	Button,
	Card,
	CardActions,
	CardContent,
	CardHeader,
	CircularProgress,
	Divider,
	Popover,
	Stack,
	Typography,
	useTheme
} from "@mui/material";
import { CustomAvatar, LoadingBox, scrollStyleSx, SearchBar } from "../../Pages/Channels/Components/Components";
import { UserPublic, useUser } from "../../Providers/UserContext/User";
import { useEffect, useRef, useState } from "react";
import { getFullname, getUsername } from "../../Pages/Channels/utils";
import { handleChatInvite } from "../../Providers/ChatContext/utils";
import { useChat } from "../../Providers/ChatContext/Chat";
import axios from "axios";
import { getStatusColor } from "../../Pages/Profile/ownerInfo";
import { updatePropArray } from "../../Providers/ChannelContext/utils";
import { UpdateType } from "../../Providers/ChannelContext/Types";
import { BACKEND_URL } from "../../Providers/UserContext/User";

interface CreateChatCard {
	anchorEl: HTMLElement | null;
	handleClose: () => void;
}

const CreateChatCard: React.FC<CreateChatCard> = ({ anchorEl, handleClose }) => {
	const theme = useTheme()
	const searchRef = useRef<HTMLInputElement>(null);

	const { user: localUser, userSocket } = useUser();
	const { chatProps, changeChatProps } = useChat();

	const [friends, setFriends] = useState<UserPublic[]>([]);
	const [searchedFriends, setSearchedFriends] = useState<UserPublic[]>([]);
	const [loading, setLoading] = useState<boolean>(true);


	useEffect(() => {
		if (!anchorEl) return;
		setLoading(true);

		function onProfileStatus(updatedUser: UserPublic) {
			const data = { id: updatedUser.id, content: updatedUser, updateType: UpdateType.updated };
			setFriends((prev) => updatePropArray(prev, data));
		}

		const getFriends = async () => {
			const response = await axios.get(`${BACKEND_URL}/user/friends/${localUser.id}`, {withCredentials: true});
			const friendsDTO: UserPublic[] = response.data.friendsDTO;
			if (friendsDTO) {
				setFriends(friendsDTO);
				friendsDTO.forEach((friend) => {
					userSocket?.emit('profileStatus', friend.id);
				});
			}
		}

		userSocket?.on('profileStatus', onProfileStatus);

		getFriends();
		if (searchRef.current) {
			searchRef.current.value = '';
		}
		setLoading(false);

		return () => {
			userSocket?.off('profileStatus');
			friends.forEach((friend) => {
				userSocket?.emit('unsubscribeProfileStatus', friend.id);
			})
		};
	}, [anchorEl]);

	function handleSearch(): void {
		if (!searchRef.current) return;

		const regex = new RegExp(searchRef.current.value, "i");
		setSearchedFriends(friends.filter((friend) => (
			getUsername(friend).match(regex) || getFullname(friend).match(regex)
		)));
	}

	const handleCreate = (user: UserPublic) => {
		handleChatInvite(user, chatProps, changeChatProps, handleClose)
	}

	const UserPanel: React.FC<{ user: UserPublic }> = ({ user }) => {
		const fullname = getFullname(user);

		return (
			<Stack
				direction={'row'}
				alignItems={'center'}
				justifyContent={'center'}
				spacing={theme.spacing(2)}
				padding={theme.spacing(.2)}
				onClick={() => handleCreate(user)}
				sx={{
					borderRadius: '8px',
					cursor: 'default',
					textAlign: 'center',
					'&:hover': {
						backgroundColor: 'rgba(255, 255, 255, .05)',
					},
				}}
			>
				<CustomAvatar src={user.image} sx={{ border: `2px solid ${getStatusColor(user.status, theme)}` }} />
				<Typography fontSize={'large'} >
					{getUsername(user)}
				</Typography>
				{user.nameNick && user.nameNick !== fullname &&
					<Typography fontSize={'small'} color='textSecondary' >
						{fullname}
					</Typography>
				}
			</Stack>
		);
	}

	const userSelection = () => {
		const userList = searchRef.current?.value.length ? searchedFriends : friends;

		return (
			<>
				{userList.map((user) => <UserPanel key={user.id} user={user} />)}
			</>
		);
	}

	return (
		<div>
			<Popover
				open={Boolean(anchorEl)}
				anchorEl={anchorEl}
				onClose={handleClose}
				anchorOrigin={{
					vertical: 'bottom',
					horizontal: 'left',
				}}
				transformOrigin={{
					vertical: 'top',
					horizontal: 'right',
				}}
			>
				<Card sx={{ maxHeight: '350px', width: '380px' }}>
					<CardHeader sx={{ textAlign: 'center', }} title='Select a Friend' />
					<CardContent sx={{ display: loading ? 'flex' : 'none' }} >
						<LoadingBox>
							<CircularProgress />
						</LoadingBox>
					</CardContent>
					{!loading && (friends.length > 0 ? (
						<>
							<Stack
								spacing={theme.spacing(1)} 
								padding={theme.spacing(1)}
							>
								<SearchBar
									sx={{
										backgroundColor: theme.palette.primary.main,
										flexGrow: 1
									}}
									ref={searchRef}
									inputChange={handleSearch}
								/>
								{(!searchRef.current?.value || searchedFriends.length !== 0) &&
									<Divider sx={{ marginX: `-${theme.spacing(1)} !important` }} />
								}
								<Stack
									sx={{
										...scrollStyleSx,
										marginTop: `-${theme.spacing(.05)} !important`,
										marginBottom: `-${theme.spacing(1)} !important`,
										height: '169px',
									}}
								>
									<Stack
										spacing={theme.spacing(.8)}
										sx={{
											paddingTop: theme.spacing(1),
											paddingBottom: theme.spacing(1),
										}}
									>
										{userSelection()}
									</Stack>
								</Stack>
							</Stack>
							<Divider />
							<CardActions>
								<Button
									fullWidth
									variant='contained'
									onClick={handleClose}
								>
									Cancel
								</Button>
							</CardActions>
						</>
					) : (
						<CardContent>
							<Box
								sx={{
									display: 'flex',
									padding: (theme) => theme.spacing(2),
									justifyContent: 'center',
									alignItems: 'center',
									flexGrow: 1,
								}}
							>
								<span
									style={{
										textAlign: 'center',
										fontSize: '28px',
										fontWeight: 'bold',
										opacity: '.5',
										whiteSpace: 'pre-line',
									}}
								>
									{"OH WAIT,\nYOU DON'T HAVE ANY..."}
								</span>
							</Box>
						</CardContent>
					))}
				</Card>
			</Popover>
		</div>
	);
};

export default CreateChatCard
