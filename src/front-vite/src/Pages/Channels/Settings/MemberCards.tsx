import axios from 'axios';
import {
  Channel,
  ChannelMember,
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
import { getFriendshipAttitude, onSendMessage, userRelationMenuItems } from './UserCardsUtils';
import { useChat } from '../../../Providers/ChatContext/Chat';

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
  channel: Channel;
  members: ChannelMember[];
  editMode: boolean;
  isAdmin: boolean;
  isMod: boolean;
};

const onChangeRole = async (member: ChannelMember, newRole: ChannelRole) => {
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
  const { user: localUser, userSocket } = useUser();
	const { chatProps, changeChatProps } = useChat();
  const navigate = useNavigate();

  async function onMute(member: ChannelMember, duration: number | null, menuCloseFunc: () => void) {
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

  const muteMenuItems = (member: ChannelMember, menuCloseFunc: () => void) => (
    MuteOptions.map((mute, index) => {
      return (
				<MenuItem key={index} onClick={() => onMute(member, mute.value, menuCloseFunc)}>
					{mute.key}
				</MenuItem>
      );
    })
  )

  const generateModerateList = (member: ChannelMember, menuCloseFunc: () => void) => (
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

	const MemberCard: React.FC<{ member: ChannelMember }> = ({ member }) => {
		const [anchorEl, setAnchorEl] = useState<any>(null);
		const [muteAnchorEl, setMuteAnchorEl] = useState<any>(null);
		const [user, setUser] = useState<UserPublic>(member.user)
		const [friendshipAttitude, setFriendshipAttitude] = useState<FriendshipAttitude>(FriendshipAttitude.available);

		const membername = getUsername(user);
		const isDiffUser = user.id !== localUser.id;
		const isModeratable = isAdmin || (member.role > ChannelRole.moderator && isMod);
		const isMemberMuted = channel?.mutedUsers?.some(
			(mutedUser) => mutedUser.userId === user.id
		);

		useEffect(() => {
			function onProfileStatus(updatedUser: UserPublic) {
				if (updatedUser.id === user.id) {
					setUser(updatedUser);
				}
			}

			//getFriendshipAttitude(member.user.id, setFriendshipAttitude);
			userSocket?.on('profileStatus', onProfileStatus);
			userSocket?.emit('profileStatus', user.id);

			return (() => {
				userSocket?.emit('unsubscribeProfileStatus', user.id);
				userSocket?.off('profileStatus');
			});
		}, [userSocket]);

		const onMuteMenuClick = (event: any) => {
			setMuteAnchorEl(event.currentTarget);
		};

		const onMuteMenuClose = () => {
			setMuteAnchorEl(null);
		};

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
						border: '3px solid',
						borderColor: getStatusColor(user?.status),
					}}
					sx={{
						marginRight: 2,
						boxShadow: theme.shadows[5],
					}}
				/>

				<Stack
					spacing={editMode && member.role !== ChannelRole.admin ? -1 : 0}
				>
					<Stack direction="row" spacing={1}>
						<ClickTypography
							variant="h3"
							fontSize="1.1em"
							fontWeight="bold"
							onClick={() => {
								navigate(`/profile/${user.id}`);
							}}
						>
							{membername}
						</ClickTypography>

						{editMode && member.role !== ChannelRole.admin ? (
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
							{user.greeting}
						</Typography>
					</Box>
				</Stack>

				{isDiffUser && (
					<Box sx={{ marginLeft: 'auto' }}>
						<IconButton onClick={onMenuClick}>
							<MemberMenuIcon />
						</IconButton>
						<Menu
							anchorEl={anchorEl}
							open={Boolean(anchorEl)}
							onClose={onMenuClose}
						>
							{isAdmin && [
								<MenuItem key={0} onClick={() => {
									if (!confirm(`Are you sure you want to transfer ownership to ${membername}?`)) return;
									onModerate(user, 'transfer', channel.id, onMenuClose)}}
								>
									Transfer Admin
								</MenuItem>,
								<Divider key={1} />,
							]}
							<MenuItem onClick={() => onSendMessage(user, chatProps, onMenuClose, changeChatProps)}>Send Message</MenuItem>
							{userRelationMenuItems(member.user, friendshipAttitude, setFriendshipAttitude, onMenuClose)}
							{isModeratable && [
								<Divider key={'div1'} />,
								<MenuItem key={'mute'} onClick={isMemberMuted ? () => onMute(member, null, onMuteMenuClose) : onMuteMenuClick}>
									{`${isMemberMuted ? 'Unmute' : 'Mute'} ${membername}`}
									{!isMemberMuted && <MuteMenuArrowIcon />}
								</MenuItem>,
								<Divider key={'div2'} />,
								generateModerateList(member, onMenuClose),
							]}
						</Menu>
						<Menu
							anchorEl={muteAnchorEl}
							open={Boolean(muteAnchorEl)}
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
	}

  return (
    <>
      {members.map((member) => (
				<MemberCard key={member.id} member={member} />
      ))}
    </>
  );
};
