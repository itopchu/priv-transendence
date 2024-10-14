import axios from 'axios';
import {
	ChannelBase,
  MemberPublic,
  ChannelRole,
  ChannelRoleValues,
} from '../../../Providers/ChannelContext/Types';
import React, { useEffect, useState } from 'react';
import {
  Box,
  Divider,
  FormControl,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import {
	MoreVert as MemberMenuIcon,
	ExpandMore as MuteMenuArrowIcon
} from '@mui/icons-material';
import { BarCard } from '../Components/CardComponents';
import { ButtonAvatar, ClickTypography } from '../Components/Components';
import { FriendshipAttitude, getStatusColor } from '../../Profile/ownerInfo';
import { User, UserPublic, useUser } from '../../../Providers/UserContext/User';
import { BACKEND_URL, getUsername, handleError } from '../utils';
import { useNavigate } from 'react-router-dom';
import { useFriendshipAttitude, userRelationMenuItems } from './UserCardsUtils';
import { useChat } from '../../../Providers/ChatContext/Chat';
import { handleChatInvite, sendGameInvite } from '../../../Providers/ChatContext/utils';

type MuteOptionsType = { key: string; value: number | null };

const MuteOptions: MuteOptionsType[] = [
  { key: 'Mute for 5 mins', value: 5 },
  { key: 'Mute for 15 mins', value: 15 },
  { key: 'Mute for 30 mins', value: 30 },
  { key: 'Mute for 60 mins', value: 60 },
  { key: 'Mute until turned off', value: null },
];

const ModerateOptions: string[] = ['kick', 'ban'];

type MemberCardsType = {
  channel: ChannelBase;
  members: MemberPublic[];
  editMode: boolean;
  isAdmin: boolean;
  isMod: boolean;
};

const onChangeRole = async (member: MemberPublic, newRole: ChannelRole) => {
	const payload = {
		role: newRole,
	};

	try {
		await axios.patch(`${BACKEND_URL}/channel/member/${member.id}`, payload, {
			withCredentials: true,
		});
		member.role = newRole;
	} catch (error) {
		handleError('Could not update user role:', error);
	}
};

export const onModerate = async (
	victim: User,
	option: string,
	channelId: number,
	menuCloseFunc: () => void
) => {
	const payload = {
		victimId: victim.id,
	};
	try {
		await axios.patch(
			`${BACKEND_URL}/channel/${option}/${channelId}`,
			payload,
			{
				withCredentials: true,
			}
		);
		menuCloseFunc();
	} catch (error) {
		handleError('Could not moderate member:', error);
	}
};

export const MemberCards: React.FC<MemberCardsType> = ({
  channel,
  members,
  editMode,
  isAdmin,
  isMod,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user: localUser, userSocket } = useUser();
	const { chatProps, changeChatProps } = useChat();

	const [menuId, setMenuId] = useState<number | null>(null);
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [muteAnchorEl, setMuteAnchorEl] = useState<HTMLElement | null>(null);
	const [publicMembers, setPublicMembers] = useState<MemberPublic[]>(members);
	const [friendshipAttitude, setFriendshipAttitude] = useState<FriendshipAttitude>(FriendshipAttitude.available);

	useFriendshipAttitude(menuId, setFriendshipAttitude);

	useEffect(() => {
		function onProfileStatus(updatedUser: UserPublic) {
			setPublicMembers((prev) => {
				let member = members.find((member) => member.user.id === updatedUser.id);
				const targetIndex = prev.findIndex((member) => member.user.id === updatedUser.id);
				const updatedArray = [...prev];

				if (!member) {
					if (targetIndex !== -1) {
						updatedArray.slice(targetIndex, 1);
						return (updatedArray);
					}
					return (prev);
				}

				if (targetIndex === -1) {
					return (prev);
				}

				member.user = updatedUser;
				updatedArray[targetIndex] = member;
				return (updatedArray);
			});
		}
		
		setPublicMembers(members);
		userSocket?.on('profileStatus', onProfileStatus);
		members.forEach((member) => {
			userSocket?.emit('profileStatus', member.user.id);
		})

		return (() => {
			members.forEach((member) => {
				if (chatProps.selected?.user.id !==  member.user.id) {
					userSocket?.emit('unsubscribeProfileStatus', member.user.id);
				}
			})
			userSocket?.off('profileStatus');
		});
	}, [userSocket, channel.id, members]);

	const onMenuClick = (event: React.MouseEvent<HTMLElement>, menuId: number) => {
		setAnchorEl(event.currentTarget);
		setMenuId(menuId);
	};

	const onMenuClose = () => {
		setAnchorEl(null);
		setMenuId(null);
	};

	const onMuteMenuClick = (event: React.MouseEvent<HTMLElement>) => {
		setMuteAnchorEl(event.currentTarget);
	};

	const onMuteMenuClose = () => {
		setMuteAnchorEl(null);
	};

	const handleGameInvite = (receiverId: number) => {
		sendGameInvite(receiverId, userSocket, chatProps, changeChatProps)
		navigate('/game');
		onMenuClose();
	}

  async function onMute(member: MemberPublic, duration: number | null, menuCloseFunc: () => void) {
    const payload = {
      victimId: member.user.id,
      muteUntil: duration,
    };
    try {
      await axios.patch(`${BACKEND_URL}/channel/mute/${channel.id}`, payload, {
				withCredentials: true,
      });
			menuCloseFunc();
    } catch (error) {
      handleError('Could not mute member:', error);
    }
  };

  const muteMenuItems = (member: MemberPublic, menuCloseFunc: () => void) => (
    MuteOptions.map((mute, index) => {
      return (
				<MenuItem key={index} onClick={() => onMute(member, mute.value, menuCloseFunc)}>
					{mute.key}
				</MenuItem>
      );
    })
  )

  const generateModerateList = (member: MemberPublic, menuCloseFunc: () => void) => (
		ModerateOptions.map((option, index) => {
			const capitalizedOption = option.charAt(0).toUpperCase() + option.slice(1);

			return (
				<MenuItem
					key={index}
					onClick={() => onModerate(member.user, option, channel.id, menuCloseFunc)}
					sx={{ color: 'red' }}
				>
					{`${capitalizedOption} ${getUsername(member.user)}`}
				</MenuItem>
			);
		})
	)

  return (
    <>
      {publicMembers.map((member) => {
				const membername = getUsername(member.user);
				const isDiffUser = member.user.id !== localUser.id;
				const isModeratable = isAdmin || (member.role > ChannelRole.moderator && isMod);
				const canChangeRole = editMode && isDiffUser && member.role !== ChannelRole.admin;

				return (
					<BarCard key={member.id}>
						<ButtonAvatar
							src={member.user?.image}
							clickEvent={() => {
								navigate(`/profile/${member.user.id}`);
							}}
							avatarSx={{
								width: 56,
								height: 56,
								border: '3px solid',
								borderColor: getStatusColor(member.user?.status, theme),
							}}
							sx={{
								marginRight: 2,
								boxShadow: theme.shadows[5],
							}}
						/>

						<Stack
							spacing={canChangeRole ? -1 : 0}
						>
							<Stack direction="row" spacing={1}>
								<ClickTypography
									variant="h3"
									fontSize="1.1em"
									fontWeight="bold"
									onClick={() => {
										navigate(`/profile/${member.user.id}`);
									}}
								>
									{membername}
								</ClickTypography>

								{canChangeRole ? (
									<FormControl variant="standard" sx={{ width: 'auto' }}>
										<Select
											sx={{
												height: '50%',
												fontSize: 'small',
												marginTop: '2px',
											}}
											value={ChannelRoleValues[member.role]}
										>
											{ChannelRoleValues.map((role, index) => {
												if (index === 0) return;

												return (
													<MenuItem
														key={index}
														value={role}
														onClick={() =>
															onChangeRole(member, index as ChannelRole)
														}
													>
														{role}
													</MenuItem>
												);
											})}
										</Select>
									</FormControl>
								) : (
									<Typography
										variant="caption"
										color="textSecondary"
										fontSize=".8em"
										alignSelf="flex-end"
									>
										{ChannelRoleValues[member.role]}
									</Typography>
								)}
							</Stack>

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
									{member.user.greeting}
								</Typography>
							</Box>
						</Stack>

						{isDiffUser && (
							<Box sx={{ marginLeft: 'auto' }}>
								<IconButton onClick={(event) => onMenuClick(event, member.user.id)}>
									<MemberMenuIcon />
								</IconButton>
								<Menu
									anchorEl={anchorEl}
									open={Boolean(anchorEl) && menuId === member.user.id}
									onClose={onMenuClose}
								>
									{isAdmin && [
										<MenuItem key={'transfer'} onClick={() => {
											if (!confirm(`Are you sure you want to transfer ownership to ${membername}?`)) return;
											onModerate(member.user, 'transfer', channel.id, onMenuClose)}}
										>
											Transfer Admin
										</MenuItem>,
										<Divider key={'dev1'} />,
									]}
									<MenuItem onClick={() => handleChatInvite(member.user, chatProps, changeChatProps, onMenuClose)}>
										Send Message
									</MenuItem>
									<MenuItem onClick={() => handleGameInvite(member.user.id)}>
										Send Game Invite
									</MenuItem>
									{userRelationMenuItems(member.user, friendshipAttitude, setFriendshipAttitude, onMenuClose)}
									{isModeratable && [
										<Divider key={'div2'} />,
										<MenuItem key={'mute'} onClick={member.isMuted ? () => onMute(member, null, onMuteMenuClose) : onMuteMenuClick}>
											{`${member.isMuted ? 'Unmute' : 'Mute'} ${membername}`}
											{!member.isMuted && <MuteMenuArrowIcon />}
										</MenuItem>,
										<Divider key={'div3'} />,
										generateModerateList(member, onMenuClose),
									]}
								</Menu>
								<Menu
									anchorEl={muteAnchorEl}
									open={Boolean(muteAnchorEl) && menuId === member.user.id}
									onClose={onMuteMenuClose}
									anchorOrigin={{
										vertical: 'bottom',
										horizontal: 'right',
									}}
								>
									{muteMenuItems(member, onMuteMenuClose)}
								</Menu>
							</Box>
						)}
					</BarCard>
				);
      })}
    </>
  );
};
