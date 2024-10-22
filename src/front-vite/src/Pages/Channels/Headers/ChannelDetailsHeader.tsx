import { Box, Button, Card, CardActions, CardContent, CardHeader, CircularProgress, Divider, IconButton, Popover, Stack, styled, Typography, useTheme } from "@mui/material";
import { CustomAvatar, HeaderIconButton, scrollStyleSx, SearchBar } from "../Components/Components";
import { useChannel } from "../../../Providers/ChannelContext/Channel";
import {
	ModeEdit as EditIcon,
	EditOff as EditOffIcon,	
	Check as ApplyIcon,
	Menu as ShowChannelLineIcon,
	MenuOpen as HideChannelLineIcon,
	Chat as ReturnToChatIcon,
	PersonAddRounded as CreateInviteIcon,
	CheckBoxOutlineBlankOutlined as BlankCheckBoxIcon,
	CheckBoxOutlined as CheckBoxIcon,
	ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { ChannelBase, ChannelRole, ChannelStates, ChannelType, UpdateType } from "../../../Providers/ChannelContext/Types";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { UserPublic, UserStatusType, useUser } from "../../../Providers/UserContext/User";
import { createInvite, handleCopy, updatePropArray } from "../../../Providers/ChannelContext/utils";
import axios from "axios";
import { getFullname, getUsername } from "../utils";
import { getStatusColor } from "../../Profile/ownerInfo";
import { useChannelLine } from "../../../Providers/ChannelContext/ChannelLine";
import { BACKEND_URL } from "../../../Providers/UserContext/User";

const enum SectionType {
	friends = 'Friends',
	channels = 'Channels',
}
const SectionTypeValues = [SectionType.friends, SectionType.channels];

interface IChannelDetailsHeaderType {
	isMod: boolean;
	editMode: boolean;
	onApplyClick: () => void;
	onEditClick: () => void;
}

interface PanelType {
	variant?: 'user' | 'channel'
	isSelected?: boolean;
	defaultIcon?: ReactElement;
	avatarSrc?: string;
	statusColor?: UserStatusType;
	secondaryText?: string;
	primaryText: string;
	onClick?: () => void;
}

const DetailHeaderPart = styled(Stack)(({ theme }) => ({
	flexDirection: 'row',
	width: 'fit-content',
	backgroundColor: theme.palette.primary.main,
	borderBottom: `1px solid ${theme.palette.secondary.dark}`,
	alignItems: 'center',
	justifyContent: 'space-between',
	gap: theme.spacing(1),
	padding: theme.spacing(2),
}));

const ChannelDetailsHeader: React.FC<IChannelDetailsHeaderType> = ({
	isMod,
	editMode,
	onApplyClick,
	onEditClick,
}) => {
	const { channelProps, changeProps } = useChannel();
	const { channelLineProps, changeLineProps } = useChannelLine();
	const { user: localUser, userSocket } = useUser();
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

	if (!channelProps.selected) return (null);

	const channel = channelProps.selected.channel; 
	const myChannels = channelProps.memberships
		.filter((membership) => membership.channel.id !== channel.id)
		.map((membership) => membership.channel);
	const popperOpen = Boolean(anchorEl) && (channel.type === ChannelType.public || channelProps.selected.role < ChannelRole.member)

	const searchRef = useRef<HTMLInputElement>(null);
	const theme = useTheme();


	const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	}

	const handleClose = () => {
		setAnchorEl(null);
	}

	const InvitePopup = () => {
		const [section, setSection] = useState<SectionType>(SectionType.friends);
		const [selectedUsers, setSelectedUsers] = useState<UserPublic[]>([]);
		const [selectedChannels, setSelectedChannels] = useState<ChannelBase[]>([]);
		const [searchedItems, setSearchedItems] = useState<UserPublic[] | ChannelBase[]>([]);
		const [friends, setFriends] = useState<UserPublic[]>([]);
		const [popupLoading, setPopupLoading] = useState<boolean>(true);
		const [creatingLink, setCreatingLink] = useState<boolean>(false);
		const [inviteLink, setInviteLink] = useState<string | undefined>(undefined);

		useEffect(() => {
			if (!popperOpen) {
				if (anchorEl) handleClose();
				return;
			}
			setPopupLoading(true);

			const getFriends = async () => {
				const response = await axios.get(`${BACKEND_URL}/user/friends/${localUser.id}`, {withCredentials: true});
				const friendsDTO: UserPublic[] = response.data.friendsDTO;
				if (friendsDTO) {
					setFriends(friendsDTO);
					friendsDTO.forEach((friend) => {
						userSocket?.emit('profileStatus', friend.id);
					});
				}
				setPopupLoading(false);
			}

			function onProfileStatus(updatedUser: UserPublic) {
				const data = { id: updatedUser.id, content: updatedUser, updateType: UpdateType.updated };
				setFriends((prev) => updatePropArray(prev, data));
			}

			setSelectedUsers([]);
			if (searchRef.current) {
				searchRef.current.value = '';
			}
			userSocket?.on('profileStatus', onProfileStatus);
			getFriends();

			return () => {
				userSocket?.off('profileStatus');
				friends.forEach((friend) => {
					userSocket?.emit('unsubscribeProfileStatus', friend.id);
				})
				setFriends([]);
			};
		}, [anchorEl]);

		function handleSearch(): void {
			if (!searchRef.current) return;

			const regex = new RegExp(searchRef.current.value, "i");
			if (section === SectionType.friends) {
				setSearchedItems(friends.filter((friend) => (
					getUsername(friend).match(regex) || getFullname(friend).match(regex)
				)));
			} else {
				setSearchedItems(myChannels.filter((channel) => (channel.name.match(regex))));
			}
		}

		function handlePanelClick<Type extends { id: number }>(
			target: Type,
			setFunc: (value: React.SetStateAction<Type[]>) => void
		) {
			setFunc((prev) => {
				const targetIndex = prev.findIndex((item) => item.id === target.id);
				if (targetIndex === -1) {
					return ([...prev, target]);
				} else {
					const newArray = [...prev];
					newArray.splice(targetIndex, 1);
					return (newArray);
				}
			});
		}

		const handleSendInvite = async () => {
			if (!userSocket || !inviteLink) return;

			selectedChannels.forEach((channel) => {
				userSocket.emit('sendChannelMessage', {
					message: inviteLink,
					channelId: channel.id
				});
			});
			selectedUsers.forEach((receiver) => {
				userSocket.emit('sendChatMessage', {
					message: inviteLink,
					receiverId: receiver.id
				});
			});
			handleClose();
		}

		const handleCopyInvite = async () => {
			try {
				handleCopy(inviteLink || '')
			} catch (error) {
				console.warn('Copy invite link failed');
			}
		}

		const handleCreateInvite = async () => {
			if (!userSocket || creatingLink) return;

			setCreatingLink(true);
			const newInvitelink = await createInvite(channel.id);
			setInviteLink(newInvitelink);
			setCreatingLink(false);
		}

		const changeSection = (newSection: SectionType) => {
			setSection(newSection);
		}

		const Panel: React.FC<PanelType> = ({
			variant = 'user',
			isSelected,
			onClick,
			avatarSrc,
			secondaryText,
			primaryText,
			statusColor,
		}) => {
			return (
				<Stack
					flexDirection={'row'}
					alignItems={'center'}
					gap={theme.spacing(1)}
					onClick={onClick}
					sx={{
						minHeight: '40px',
						padding: theme.spacing(.4),
						paddingInline: theme.spacing(.8),
						overflow: 'hidden',
						borderRadius: '8px',
						cursor: 'default',
						textAlign: 'center',
						'&:hover': {
							backgroundColor: 'rgba(255, 255, 255, .05)',
						},
					}}
				>
					<Stack
						flexGrow={1}
						flexDirection={'row'}
						alignItems={'center'}
						justifyContent={'flex-start'}
						gap={theme.spacing(1)}
					>
						<CustomAvatar
							variant={variant === 'user' ? 'default' : 'channel'}
							alt={primaryText}
							src={avatarSrc}
							sx={{
								border: `2px solid ${getStatusColor(statusColor, theme)}`
							}}
						/>
						<Typography fontSize={'large'} maxWidth={'60%'} noWrap >
							{primaryText}
						</Typography>
						{secondaryText && (
							<Typography
								fontSize={'small'} 
								color='textSecondary'
							>
								{secondaryText}
							</Typography>
						)}
					</Stack>
					<IconButton
						sx={{
							height: '1em',
							width: '1em',
							borderRadius: '25%',
						}}
					>
						{isSelected ? <CheckBoxIcon /> : <BlankCheckBoxIcon />}
					</IconButton>
				</Stack>
			);
		}

		const userSelection = () => {
			const userList = searchRef.current?.value.length
				? searchedItems as UserPublic[]
				: friends;

			return (
				<>
					{userList.map((user) => {
						const fullname = getFullname(user);
						const isSelected = selectedUsers.some((selectedUser) => selectedUser.id === user.id);

						return (
							<Panel
								key={user.id}
								avatarSrc={user?.image}
								primaryText={getUsername(user)}
								secondaryText={user?.nameNick !== fullname ? fullname : undefined}
								statusColor={user?.status}
								isSelected={isSelected}
								onClick={() => handlePanelClick(user, setSelectedUsers)}
							/>
						);
					})}
				</>
			);
		}

		const channelSelection = () => {
			const channelList = searchRef.current?.value.length
				? searchedItems as ChannelBase[]
				: myChannels;

			return (
				<>
					{channelList.map((channel) => {
						const isSelected = selectedChannels.some((selectedChannel) =>
							selectedChannel.id === channel.id
						);
						const secondaryText = `${channel.memberCount} ${(channel.memberCount || 0) > 1 ? 'members' : 'member'}`

						return (
							<Panel
								variant="channel"
								key={channel.id}
								avatarSrc={channel?.image}
								primaryText={channel.name}
								secondaryText={secondaryText}
								isSelected={isSelected}
								onClick={() => handlePanelClick(channel, setSelectedChannels)}
							/>
						);
					})}
				</>
			);
		}

		const sectionGroup = () => (
			<>
				{SectionTypeValues.map((value) => (
					<Typography
						key={value}
						onClick={() => changeSection(value)}
						sx={{
							fontSize: 'medium',
							cursor: 'pointer',
						}}
						color={
							value === section
								? undefined
								: 'textSecondary'
						}
					>
						{`${value === SectionType.channels ?  'My ' : ''}${value}`}
					</Typography>
				))}
			</>
		);

		return (
			<div>
				<Popover
					open={popperOpen}
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
					<Card sx={{ height: '400px', width: '380px', display: 'flex', flexDirection: 'column' }}>
						<CardHeader sx={{ textAlign: 'center', }} title={`Select ${section}`} />
						<Stack
							flexDirection={'row'}
							justifyContent={'space-evenly'}
						>
							{sectionGroup()}
						</Stack>
						<CardContent 
							sx={{
								flexGrow: 1,
								display: popupLoading ? 'flex' : 'none',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<CircularProgress size={60} />
						</CardContent>
						{!popupLoading && (
							((section === SectionType.friends && friends.length > 0)
							|| (section === SectionType.channels && myChannels.length > 0))
						? (
							<>
								<Stack
									flexGrow={1}
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
									{(!searchRef.current?.value || searchedItems.length !== 0) &&
										<Divider sx={{ marginX: `-${theme.spacing(1)} !important` }} />
									}
									<Stack
										sx={{
											...scrollStyleSx,
											marginTop: `-${theme.spacing(.05)} !important`,
											marginBottom: `-${theme.spacing(1)} !important`,
											height: '170px',
										}}
									>
										<Stack
											spacing={theme.spacing(.8)}
											sx={{
												paddingTop: theme.spacing(1),
												paddingBottom: theme.spacing(1),
											}}
										>
											{section === SectionType.friends
												? userSelection()
												: channelSelection()
											}
										</Stack>
									</Stack>
								</Stack>
							</>
						) : (
							<CardContent sx={{ flexGrow: 1, }} >
								<Box
									sx={{
										display: 'flex',
										padding: (theme) => theme.spacing(2),
										justifyContent: 'center',
										alignItems: 'center',
										height: '100%',
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
										{`${section === SectionType.friends
											? "OH WAIT,\nYOU DON'T HAVE ANY..."
											: "TRY JOINING A CHANNEL"}`
										}
									</span>
								</Box>
							</CardContent>
						))}
						<Divider />
						<CardContent
							sx={{
								paddingBottom: 0,
								paddingTop: theme.spacing(1),
								paddingInline: theme.spacing(1),
							}}
						>
							<Box 
								flexGrow={1}
								flexDirection={'row'}
								sx={{
									display: 'flex',
									padding: theme.spacing(.5),
									paddingInline: theme.spacing(1),
									backgroundColor: theme.palette.primary.dark,
									borderRadius: '8px',
									textAlign: 'center',
									alignItems: 'center',
									justifyContent: inviteLink ? 'space-between' : 'center',
									height: '32px',
								}}
							>
								<Typography
									sx={{
										whiteSpace: 'nowrap',
										textOverflow: 'clip',
										overflowX: 'auto',
										msOverflowStyle: 'none',
										scrollbarwidth: 'none',
										'&::-webkit-scrollbar': {
											display: 'none',
										},
									}}
								>
									{inviteLink || 'Create an invite link'}
								</Typography>
								{inviteLink && (
									<IconButton
										onClick={handleCopyInvite}
										sx={{ 
											width: '30px',
											height: '30px',
											borderRadius: '25%',
										}}
									>
										<CopyIcon fontSize="small" />
									</IconButton>
								)}
							</Box>
						</CardContent>
						<CardActions>
							<Button
								fullWidth
								disabled={Boolean(inviteLink)}
								variant='contained'
								onClick={handleCreateInvite}
								sx={{ height: '2.6em' }}
							>
								{creatingLink ? <CircularProgress color="secondary" size={30}/> : 'Create Invite'}
							</Button>
							<Button
								fullWidth
								disabled={!inviteLink
									|| (!selectedUsers.length && !selectedChannels.length)}
								variant='contained'
								onClick={handleSendInvite}
								sx={{ height: '2.6em' }}
							>
								Send Invite
							</Button>
						</CardActions>
					</Card>
				</Popover>
			</div>
		);
	};

	return (
		<>
			<InvitePopup />
			<Stack
				direction='row'
				sx={{
						position: 'absolute',
						height: '65px',
						width: '100%',
						justifyContent: 'space-between',
						zIndex: 2,
				}}
			>
				<DetailHeaderPart
					sx={{
						borderRight: `1px solid ${theme.palette.secondary.dark}`,
						borderBottomRightRadius: '2em',
						paddingRight: theme.spacing(4),
					}}
				>
					<Stack flexDirection={'row'} gap={1} >
						<HeaderIconButton
							label={!channelLineProps.hidden ? "Hide channels" : "Show channels"}
							Icon={!channelLineProps.hidden ? HideChannelLineIcon : ShowChannelLineIcon}
							onClick={() => changeLineProps({ hidden: !channelLineProps.hidden })}
						/>
						<HeaderIconButton
							Icon={ReturnToChatIcon}
							label="Return to chat"
							iconFontSize="24px"
							onClick={() => changeProps({ state: ChannelStates.chat })}
						/>
					</Stack>
				</DetailHeaderPart>
				<DetailHeaderPart
					visibility={channel.type === ChannelType.public || isMod ? 'visible' : 'hidden'}
					sx={{
						borderLeft: `1px solid ${theme.palette.secondary.dark}`,
						borderBottomLeftRadius: '2em',
						paddingLeft: theme.spacing(4),
					}}
				>
					{!editMode && <HeaderIconButton Icon={CreateInviteIcon} onClick={handleOpen} />}
					{isMod && <HeaderIconButton Icon={!editMode ? EditIcon : EditOffIcon} onClick={onEditClick} />}
					{editMode && <HeaderIconButton Icon={ApplyIcon} onClick={onApplyClick} />}
				</DetailHeaderPart>
			</Stack>
		</>
	);
}

export default ChannelDetailsHeader
