import { useRef, useState } from 'react';
import { ChatStatus, IChat } from './InterfaceChat';
import { Box, Drawer, Divider, Stack, IconButton, InputBase, Typography, Avatar, Popover, Card, CardHeader, CardContent, CardActions, Button } from '@mui/material';
import { darken, alpha, useTheme } from '@mui/material/styles';
import { Add as AddIcon } from '@mui/icons-material';
import { useChat } from '../../Providers/ChatContext/Chat';
import { getUsername } from '../../Pages/Channels/utils';
import CreateChatCard from './CreateChatCard';

const ContentDrawer = () => {
  const theme = useTheme();
	const searchRef = useRef<HTMLInputElement>(null);
	const { chatProps, changeChatProps } = useChat();

	const [searchedChats, setFilteredChats] = useState<IChat[]>(chatProps.chats);
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const toggleChatStatus = (status: ChatStatus, selection: IChat | undefined) => {
		changeChatProps({ chatStatus: status, selected: selection });
  };

	const handleCardClose = () => {
		setAnchorEl(null);
	}

	const handleCardOpen = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	}

  const handleClose = () => {
    if (chatProps.selected == undefined)
			changeChatProps({ chatStatus: ChatStatus.Bubble });
  }

  const handleInputChange = () => {
		if (!searchRef.current) return;

		const regex = new RegExp(searchRef.current.value, "i");
		
		const chats = chatProps.chats.filter((chat) => {
			const chatname = getUsername(chat.user);

			return (chatname.match(regex));
		});
		setFilteredChats(chats);
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
        <IconButton
					sx={{ color: theme.palette.secondary.main }}
					edge="start"
					aria-label="search"
					onClick={handleCardOpen}
				>
          <AddIcon />
        </IconButton>
        <Divider sx={{ marginY: '0.3em' }} orientation="vertical" flexItem />
        <InputBase
					inputRef={searchRef}
					onChange={handleInputChange}
					sx={{ marginLeft: '8px', color: theme.palette.secondary.main }}
					placeholder="Search..."
				/>
      </Stack>
      <Box sx={{ height: '0', color: 'transparent', bgcolor: 'transparent' }}>
        <Divider orientation="horizontal" />
      </Box>
      {searchedChats.map((chat, index) => (
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

  return (
		<>
			<CreateChatCard anchorEl={anchorEl} handleClose={handleCardClose} />
			<Drawer
				anchor="right"
				open={chatProps.chatStatus == ChatStatus.Drawer}
				onClose={handleClose}
				sx={{ '& .MuiPaper-root': { backgroundColor: darken(theme.palette.background.default, 0.3) } }}
			>
				{DrawerContent}
			</Drawer>
		</>
  );
};

export default ContentDrawer;
