import React, { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Divider, Typography, Button, IconButton, Container, useTheme, Stack } from '@mui/material';
import { styled } from '@mui/system';
import { io, Socket } from 'socket.io-client';
import ChannelCreateCard from './ChannelCreateCard';
import {
  Add as AddIcon,
  Group as GroupIcon,
  Cancel as CancelIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
	MoreVertSharp as MiscIcon,
} from '@mui/icons-material';
import { ChannelMember, ChannelContextProvider, useChannel } from './channels';

interface ChannelTypeEvent {
  component: React.ReactNode;
  newColor: string;
  name: string;
  clickEvent: () => void;
}

const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';

const ChannelsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [showCreateCard, setShowCreateCard] = useState(false);
  const { memberships, publicChannels } = useChannel();

  const ChannelLine: React.FC<ChannelTypeEvent> = ({ component, newColor, name, clickEvent }) => {
    return (
      <Stack
        direction={'row'}
        gap={2}
        paddingX={'0.5em'}
        onClick={clickEvent}
        bgcolor={theme.palette.primary.main}
        justifyContent={'space-between'}
        alignItems={'center'}
        textAlign={'center'}
        minWidth={'218px'}
        sx={{
          width: '100%',
          cursor: 'pointer',
          transition: 'padding-left ease-in-out 0.3s, padding-right ease-in-out 0.3s, border-radius ease-in-out 0.3s, background-color ease-in-out 0.3s',
          '&:hover': {
            bgcolor: theme.palette.primary.dark,
            borderRadius: '2em',
            paddingLeft: '1em',
            paddingRight: '0.02em',
          },
        }}
      >
        <GroupIcon sx={{ width: '10%' }} />
        <Typography noWrap sx={{
          maxWidth: '78%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {name}
        </Typography>
        <IconButton
        onClick={(event) => { event.stopPropagation(); clickEvent }}
        sx={{
          minWidth: '10%',
          width: '40px',
          height: '40px', 
          '&:hover': {
            color: newColor,
          },
        }}>
          {component}
        </IconButton>
      </Stack>
    );
  };

  let generateAvailableChannels = () => {
		if (!publicChannels.length)
				return;

    return (
      <Stack gap={1}>
        {Array.from({ length: publicChannels.length }, (_, index) => (
          <ChannelLine
			key={index}
			name={publicChannels[index].name}
			component={<LoginIcon />}
			newColor={"green"}
			clickEvent={() => console.log(`Channel ${index + 1} clicked`)}
		  />
        ))}
      </Stack>
    );
  };

  let generateJoinedChannels = () => {
		if (!memberships.length)
				return;

      return (
        <Stack gap={1}>
          {Array.from({ length: memberships.length }, (_, index) => (
			<ChannelLine
			  key={index}
			  name={memberships[index].channel.name}
			  component={<MiscIcon />}
			  newColor={"white"}
			  clickEvent={() => console.log(`Channel ${index + 1} clicked`)}
			/>
		  ))}
		</Stack>
	);
  };

  let channelCreationSection = () => {
    return (
      <Box
        height={'80vh'}
        bgcolor={theme.palette.primary.light}
      >
        channel creation part
      </Box>
    );
  };

  let createChannelButton = () => {
    return (
      <Stack
        maxWidth={'100%'}
        height={'48px'}
        direction={'row'}
        justifyContent={'center'}
        alignItems={'center'}
        gap={1}
        bgcolor={theme.palette.primary.main}
        sx={{
          cursor: 'pointer',
          transition: 'background-color ease-in-out 0.3s, border-radius ease-in-out 0.3s',
          '&:hover': {
            borderRadius: '2em',
            bgcolor: theme.palette.primary.dark,
          },
        }}
				onClick={() => {setShowCreateCard(true)}}
      >
        <AddIcon />
        <Typography>
          Create a Channel
        </Typography>
      </Stack>
    );
  };

  let pageContainer = () => {
    return (
      <Container sx={{ padding: theme.spacing(3) }}>
			  {showCreateCard && (<ChannelCreateCard setIsVisible={setShowCreateCard} />)}
        <Stack
          direction={'row'}
          bgcolor={theme.palette.primary.dark}
          divider={<Divider orientation='vertical' flexItem />}
          padding={'1em'}
        >
          <Stack
            padding={'1em'}
            gap={1}
            direction={'column'}
            height={'80vh'}
            bgcolor={theme.palette.primary.light}
            divider={<Divider flexItem />}
            width={'250px'}
          >
            {createChannelButton()}
            <Stack
              sx={{ overflowY: 'auto', maxHeight: '100%' }}
              divider={<Divider orientation='horizontal' flexItem />}
              gap={2}
            >
              {generateJoinedChannels()}
              {generateAvailableChannels()}
            </Stack>
          </Stack>
          <Stack
            width={'100%'}
          >
            {channelCreationSection()}
          </Stack>
        </Stack>
      </Container>
    );
  };

  return (
      pageContainer()
  );
};

export default ChannelsPage;
