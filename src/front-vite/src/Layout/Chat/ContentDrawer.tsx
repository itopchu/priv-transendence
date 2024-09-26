import React from 'react';
import { ChatStatus, Chat } from './InterfaceChat';
import { Box, Drawer, Divider, Stack, IconButton, InputBase, Typography, Avatar } from '@mui/material';
import { darken, alpha, useTheme } from '@mui/material/styles';
import { Add as AddIcon } from '@mui/icons-material';
import { useChat } from '../../Providers/ChatContext/Chat';
import { getUsername } from '../../Pages/Channels/utils';

const ContentDrawer = () => {
  const theme = useTheme();
	const { chatProps, changeChatProps } = useChat();

  const toggleChatStatus = (status: ChatStatus, selection: Chat | undefined) => {
		changeChatProps({ chatStatus: status, selected: selection });
  };

  const handleSearchClick = () => {
    if (chatProps.searchPrompt == '') {
			changeChatProps({ searchPrompt: 'Search...' });
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeChatProps({ searchPrompt: event.target.value });
    console.log('Search Prompt onChange activated: ', chatProps.searchPrompt);
  };

  const DrawerContent = (
    <Stack width={250} role="chatrooms" direction="column"
      sx={{
        width: 250,
        backgroundColor: alpha(theme.palette.background.default, 0.05),
        '&:hover': {
          backgroundColor: alpha(theme.palette.background.default, 0.1),
        },
        '& > *': {
          alignItems: 'center',
          height: '3em',
          color: theme.palette.secondary.main,
          marginY: '0.3em',
          boxShadow: `0px ${theme.spacing(0.5)} ${theme.spacing(0.75)} rgba(0, 0, 0, 0.2)`,
          backgroundColor: alpha(theme.palette.background.default, 0.5),
          transition: 'border-radius 0.2s ease, boxShadow 0.2s ease',
          '&:hover': {
            boxShadow: `0px ${theme.spacing(0.5)} ${theme.spacing(0.75)} rgba(0, 0, 0, 1)`,
            backgroundColor: alpha(theme.palette.background.default, 0.9),
            borderRadius: '2em',
          },
        },
      }}
    >
      <Stack
        direction="row"
        justifyContent="center"
      >
        <IconButton sx={{ color: theme.palette.secondary.main }} edge="start" onClick={handleSearchClick} aria-label="search">
          <AddIcon />
        </IconButton>
        <Divider sx={{ marginY: '0.3em' }} orientation="vertical" flexItem />
        <InputBase value={chatProps.searchPrompt} onChange={handleInputChange} sx={{ marginLeft: '8px', color: theme.palette.secondary.main }} placeholder="Search..." />
      </Stack>
      <Box sx={{ height: '0', color: 'transparent', bgcolor: 'transparent' }}>
        <Divider orientation="horizontal" />
      </Box>
      {chatProps.chats.map((chat, index) => (
        <Stack key={index} direction={'row'} onClick={() => toggleChatStatus(ChatStatus.Chatbox, chat)}
          sx={{
            cursor: 'pointer',
            justifyContent: 'space-between',
            paddingX: '1em',
            alignItems: 'center',
          }}
        >
					<Avatar src={chat.user?.image} />
          <Stack direction={'row'} flexGrow={1} justifyContent={'space-evenly'}>
            <Typography sx={{ '&:hover': { color: theme.palette.secondary.dark } }}>
              {getUsername(chat.user)}
            </Typography>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );

  const handleClose = () => {
    if (chatProps.selected == undefined)
			changeChatProps({ chatStatus: ChatStatus.Bubble });
  }

  return (
    <Drawer
      anchor="right"
      open={chatProps.chatStatus == ChatStatus.Drawer}
      onClose={handleClose}
      sx={{ '& .MuiPaper-root': { backgroundColor: darken(theme.palette.background.default, 0.3) } }}
    >
      {DrawerContent}
    </Drawer>
  );
};

export default ContentDrawer;
