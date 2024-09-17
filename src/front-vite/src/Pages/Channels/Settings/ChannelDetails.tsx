import React from 'react';
import axios from 'axios';
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Button,
} from '@mui/material';
import {
  CustomAvatar,
  DescriptionBox,
  lonelyBox,
} from '../Components/Components';
import { ChannelStates } from '..';
import { BACKEND_URL, getUsername, handleError } from '../utils';
import { ChannelRole, } from '../../../Providers/ChannelContext/Channel';
import { ModeEdit as EditIcon, } from '@mui/icons-material';
import { SettingsBoxType } from './Types';
import { SettingsContainer, SettingsDivider, SettingsUserCardBox } from '../Components/SettingsComponents';
import { MemberCards } from './MemberCards';

export const ChannelDetails: React.FC<SettingsBoxType> = ({ membership, channelProps, changeProps }) => {
	if (!membership) return (lonelyBox());

  const channel = membership.channel;
  const members = channel.members
    .sort((a, b) => getUsername(a).localeCompare(getUsername(b)))
    .sort((a, b) => a.role - b.role);

  const isAdmin = membership.role === ChannelRole.admin;
  const isMod = membership.role < ChannelRole.member;

  const enableEditMode = () => {
    changeProps({ state: ChannelStates.editMode });
  };

	const onLeave = async () => {
    if (!confirm(`Are you sure you want to leave ${channel.name}?`)) return;

    try {
      await axios.delete(`${BACKEND_URL}/channel/leave/${membership.id}`, {
        withCredentials: true,
      });
      changeProps({ selected: undefined, state: undefined });
    } catch (error) {
      handleError('Could not leave channel:', error);
    }
  };

  const ChannelDetails = () => (
    <>
      <Stack
        direction={'row'}
        justifyContent={'center'}
        spacing={3}
        alignItems={'center'}
      >
        <CustomAvatar
          src={channel.image}
          sx={{
            height: '7em',
            width: '7em',
          }}
        />

        <Stack>
          <Typography variant="h5" fontWeight="bold">
            {channel.name}
          </Typography>

          <Typography variant="body1" color={'textSecondary'}>
            {`${channel.type} • ${members.length}\
							${members.length > 1 ? 'members' : 'member'}`}
          </Typography>
        </Stack>
      </Stack>

      <DescriptionBox sx={{ width: '65%',  minWidth: '20em' }}>
        <Typography
					sx={{
						wordBreak: 'break-word',
						whiteSpace: 'pre-wrap',
					}}
				>
          {channel.description}
        </Typography>
      </DescriptionBox>
    </>
  );

  return (
    <SettingsContainer>
      <Stack direction={'row'} padding={0}>
        <Stack
          padding={2}
          spacing={3}
          alignItems="center"
          minWidth={'calc(100% - 48px)'}
        >
          {ChannelDetails()}

          <SettingsDivider>Members</SettingsDivider>

          <SettingsUserCardBox>
            <Stack spacing={1}>
              <MemberCards
                channel={channel}
                members={members}
                editMode={false}
                isAdmin={isAdmin}
                isMod={isMod}
              />
            </Stack>
          </SettingsUserCardBox>

					<SettingsDivider>
						Leaving?
					</SettingsDivider>
					<Box sx={{ marginTop: 3, textAlign: 'center' }}>
						<Button
							variant="contained"
							color="error"
							onClick={onLeave}
						>
							Leave Channel
						</Button>
					</Box>
        </Stack>

        {isMod && (
          <Box sx={{ alignSelf: 'flex-start' }}>
            <IconButton onClick={enableEditMode}>
							<EditIcon sx={{ fontSize: '36px' }} />
            </IconButton>
          </Box>
        )}
      </Stack>
    </SettingsContainer>
  );
};
