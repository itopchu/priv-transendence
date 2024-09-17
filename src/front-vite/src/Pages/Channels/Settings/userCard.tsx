import axios from 'axios';
import {
  Channel,
  ChannelMember,
  ChannelRole,
  ChannelRoleValues,
} from '../../../Providers/ChannelContext/Channel';
import React, { useState } from 'react';
import {
  Box,
  Card,
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
import { ButtonAvatar, ClickTypography } from '../Components/Components';
import { MoreVert as UserMenuIcon } from '@mui/icons-material';
import { useUser } from '../../../Providers/UserContext/User';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL, getUsername, handleError } from '../utils';

type MuteOptionsType = { key: string; value: number | null };

const MuteOptions: MuteOptionsType[] = [
  { key: 'Mute for 5 mins', value: 5 },
  { key: 'Mute for 15 mins', value: 15 },
  { key: 'Mute for 30 mins', value: 30 },
  { key: 'Mute for 60 mins', value: 60 },
  { key: 'Mute until I turn it off', value: null },
];

const ModerateOptions: string[] = ['kick', 'ban'];

type UserCardsType = {
  channel: Channel;
  members: ChannelMember[];
  editMode: boolean;
  isAdmin: boolean;
  isMod: boolean;
};

export const UserCards: React.FC<UserCardsType> = ({
  channel,
  members,
  editMode,
  isAdmin,
  isMod,
}) => {
  const theme = useTheme();
  const { user } = useUser();
  const navigate = useNavigate();

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

  const onMute = async (member: ChannelMember, duration: number | null, menuCloseFunc: () => void) => {
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

  const onBlock = async (victimId: number, menuCloseFunc: () => void) => {
		try {
			await axios.patch(`${BACKEND_URL}/user/block/${victimId}`, { withCredentials: true });
			menuCloseFunc();
		} catch (error) {
			handleError('Could not block/unblock user', error);
		}
  }

  const onModerate = async (member: ChannelMember, option: string, menuCloseFunc: () => void) => {
    const payload = {
      victimId: member.user.id,
    };
    try {
      await axios.patch(
        `${BACKEND_URL}/channel/${option}/${channel.id}`,
        payload,
        {
          withCredentials: true,
        }
      );
			menuCloseFunc();
    } catch (error) {
      handleError('Could not kick/ban member:', error);
    }
  };

  const generateMuteList = (member: ChannelMember, menuCloseFunc: () => void) => (
    MuteOptions.map((mute, index) => {
      return (
        <React.Fragment key={index}>
      	<MenuItem onClick={() => onMute(member, mute.value, menuCloseFunc)}>
      	  {mute.key}
      	</MenuItem>
        </React.Fragment>
      );
    })
  )

  const generateModerateList = (member: ChannelMember, menuCloseFunc: () => void) => (
		ModerateOptions.map((option, index) => {
			const capitalizedOption = option.charAt(0).toUpperCase() + option.slice(1);

			return (
					<MenuItem
					key={index}
					onClick={() => onModerate(member, option, menuCloseFunc)}
					sx={{ color: 'red' }}
					>
					{`${capitalizedOption} ${getUsername(member.user)}`}
					</MenuItem>
					);
		})
	)

  return (
    <>
      {members.map((member, index) => {
        const memberUser = member.user;
        const membername = getUsername(memberUser);

		const isBlocked = user?.blockedUsers?.some(
		  (blockedUser) => blockedUser.id === member.user.id
		);
        const isDiffUser = memberUser.id !== user.id;
        const isMemberMuted = channel?.mutedUsers?.some(
          (mutedUser) => mutedUser.userId === member.user.id
        );

        const [anchorEl, setAnchorEl] = useState<any>(null);
        const [muteAnchorEl, setMuteAnchorEl] = useState<any>(null);

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
          <Card
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              padding: 2,
              maxWidth: 600,
              minWidth: '65%',
              backgroundColor: theme.palette.primary.main,
            }}
          >
            <ButtonAvatar
              src={memberUser?.image}
              clickEvent={() => {
                navigate(`/profile/${member.user.id}`);
              }}
              avatarSx={{
                width: 56,
                height: 56,
                border: 0,
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
                    navigate(`/profile/${member.user.id}`);
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
                  {memberUser.greeting}
                </Typography>
              </Box>
            </Stack>

            {isDiffUser && (
              <Box sx={{ marginLeft: 'auto' }}>
                <IconButton onClick={onMenuClick}>
                  <UserMenuIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={onMenuClose}
                >
                  {isAdmin && [
                    <MenuItem onClick={() => onModerate(member, 'transfer', onMenuClose)}>
                      Transfer admin
                    </MenuItem>,
                    <Divider />,
                  ]}
                  <MenuItem onClick={onMenuClose} >{'Add friend'}</MenuItem>
                  <MenuItem onClick={() => onBlock(member.user.id, onMenuClose)} >
										{`${isBlocked ? 'Block' : 'Unlock'} ${membername}`}
									</MenuItem>
                  <Divider />
                  {isMemberMuted ? (
                    <MenuItem onClick={() => onMute(member, null, onMuteMenuClose)} >
											{`Unmute ${membername}`}
										</MenuItem>
                  ) : (
                    <MenuItem onClick={onMuteMenuClick} >
                      {`Mute ${membername}`}
                    </MenuItem>
                  )}
                  {isMod && [
                    <Divider />,
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
									{generateMuteList(member, onMuteMenuClose)}
                </Menu>
              </Box>
            )}
          </Card>
        );
      })}
    </>
  );
};
