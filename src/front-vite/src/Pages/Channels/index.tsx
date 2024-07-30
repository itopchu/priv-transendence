import React, { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Divider, Typography, Button, IconButton, Container, useTheme, Stack } from '@mui/material';
import { styled } from '@mui/system';
import { io, Socket } from 'socket.io-client';
import {
  Add as AddIcon,
  Group as GroupIcon,
  Cancel as CancelIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
} from '@mui/icons-material';

interface ChannelTypeEvent {
  component: React.ReactNode;
  newColor: string;
  clickEvent: () => void;
}

const ChannelsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const ChannelLine: React.FC<ChannelTypeEvent> = ({ component, newColor, clickEvent }) => {
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
          Welcome to the jungle
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

  let getAvailableChannels = () => {
    return (
      <Stack gap={1}>
        {Array.from({ length: 5 }, (_, index) => (
          <ChannelLine key={index} component={<LoginIcon />} newColor={"green"} clickEvent={() => console.log(`Channel ${index + 1} clicked`)} />
        ))}
      </Stack>
    );
  };

  let getJoinedChannels = () => {
    return (
      <Stack gap={1}>
        {Array.from({ length: 5 }, (_, index) => (
          <ChannelLine key={index} component={<LogoutIcon />} newColor={"red"} clickEvent={() => console.log(`Channel ${index + 1} clicked`)} />
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

  const WEBSOCKET_URL: string = import.meta.env.ORIGIN_URL_WEBSOCKET || 'http://localhost.codam.nl:3001';


  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  const send = () => {
    socket?.emit("message", "domates");
    console.log("domates");
  };


  useEffect(() => {

    const newSocket = io(`${WEBSOCKET_URL}`);
    setSocket(newSocket);
    console.log("baglanti kuruluyor");

    newSocket.on("connect", () => {
      console.log("connected");
    });

    newSocket.on("disconnect", () => {
      console.log("disconnected");
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const messageListener = (message: string) => {
    setMessages((prevMessages) => [...prevMessages, message]);
    console.log("patates");
  };

  useEffect(() => {
    socket?.on("message", messageListener);
    return () => {
      socket?.off("message", messageListener);
    };
  }, [socket]);

  let createChannelButton = () => {
    return (
      <Stack
        maxWidth={'100%'}
        height={'48px'}
        direction={'row'}
        justifyContent={'center'}
        onClick={send}//Buraya bak
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
        <div>{messages ? messages : 'Veri bekleniyor...' }</div>
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
              {getJoinedChannels()}
              {getAvailableChannels()}
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
