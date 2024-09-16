import { ChatProps, ChatStatus, Chat } from './InterfaceChat';
import { Box, Stack, IconButton, InputBase, Button, ListItemText, Avatar, Typography } from '@mui/material';
// import { useTheme } from '@emotion/react';
import {
	Send as SendIcon,
	Cancel as CancelIcon,
	KeyboardBackspace as BackIcon,
} from '@mui/icons-material';
import { ButtonAvatar, ClickTypography } from '../../Pages/Channels/Components/Components';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { useUser } from '../../Providers/UserContext/User';
import { useChat } from '../../Providers/ChatContext/Chat';
import { getUsername, trimMessage } from '../../Pages/Channels/utils';
import { formatDate } from '../../Pages/Channels/chatBox';

const ContentChat = () => {
	const { chatProps, changeChatProps } = useChat();
	const { userSocket } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);

	const onSend = () => {
		if (!inputRef.current) return;

    const cleanMessage = trimMessage(inputRef.current.value);
    if (cleanMessage.length) {
      const payload = {
        chatId: chatProps.selected?.id,
        content: cleanMessage,
      };
      userSocket?.emit('sendDirectMessage', payload);
    }
		inputRef.current.value = '';
	}

  const toggleChatStatus = (status: ChatStatus, selection: Chat | undefined) => {
    changeChatProps({ chatStatus: status, selected: selection });
  };
  // const theme = useTheme();
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        position: 'fixed',
        border: '1px solid #abc',
        bottom: 16,
        right: 16,
        width: 300,
        bgcolor: (theme) => theme.palette.background.default,
        borderRadius: '1em',
        maxHeight: '70vh',
        minHeight: '30vh',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <Stack direction={'column'} sx={{ flexGrow: 1, maxHeight: '100%' }}>
        <Stack
          direction={'row'}
					spacing={1.4}
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            borderTopLeftRadius: '1em',
            borderTopRightRadius: '1em',
            color: (theme) => theme.palette.secondary.main,
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingX: '0.5em',
            paddingY: '0.1em',
            bgcolor: (theme) => theme.palette.background.default,
            height: '48px',
          }}
        >
					<IconButton
						onClick={() => {
							toggleChatStatus(ChatStatus.Drawer, undefined)
						}}
						sx={{
							width: '40px',
							height: '40px',
							color: (theme) => theme.palette.secondary.main,
						}}
					>
						<BackIcon sx={{ fontSize: '120%' }} />
					</IconButton>
					<ButtonAvatar
						clickEvent={() => (navigate(`/profile/${chatProps.selected?.user.id}`))}
						src={chatProps.selected?.user?.image}
					/>
					<ClickTypography
						onClick={() => (navigate(`/profile/${chatProps.selected?.user.id}`))}
						sx={{
							overflow: 'hidden',
							textOverflow: 'ellipsis'
							}}
					>
						{getUsername(chatProps.selected?.user)}
					</ClickTypography>
					<Box flexGrow={1} />
					<IconButton
						onClick={() => { toggleChatStatus(ChatStatus.Bubble, undefined) }}
						sx={{
							marginLeft: 'auto',
							color: (theme) => theme.palette.secondary.main,
							'&:hover': {
								color: (theme) => theme.palette.error.main,
							},
						}}
					>
						<CancelIcon />
					</IconButton>
        </Stack>
        <Stack direction={'column'} sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: '50vh' }}>
          <Stack
						flexGrow={1}
            direction="column"
            padding="0.5em"
            spacing={1}
            bgcolor={(theme) => theme.palette.background.default}
            border={2}
            borderColor={(theme) => theme.palette.divider}
            sx={{
							maxHeight: 'calc(70vh - 130px)',
              overflowY: 'auto',
              '&': {
                scrollbarWidth: 'thin',
                scrollbarColor: (theme) => `${theme.palette.primary.dark} transparent`,
              },
              '&:hover': {
                  scrollbarColor: (theme) => `${theme.palette.secondary.dark} transparent`,
              },
            }}
          >
            {chatProps?.messages?.length !== 0 && chatProps.messages.map((message, idx) => {
							const timestamp = formatDate(message.timestamp);

							return (
								<Stack direction="row" spacing={1} key={idx}>
								<ButtonAvatar
									avatarSx={{ border: '0px' }}
									clickEvent={() => (navigate(`/profile/${message.author.id}`))}
									src={message.author?.image}
								/>
									<Stack
										direction="column"
										spacing={0.5}
										padding="0.5em"
										bgcolor={(theme) => theme.palette.primary.main}
										borderRadius="0.3em"
										sx={{ width: '70%' }}
									>
										<Stack spacing={-.1} direction="column" sx={{ wordWrap: 'break-word'}}>
											<Typography
													sx={{ wordWrap: 'break-word' }}
											>
												{message.content}
											</Typography>
											<Typography
												color={'gray'}
												sx={{
													display: 'flex',
													justifyContent: 'flex-end',
													fontSize: '0.5rem',
												}}
											>
												{timestamp.time}
											</Typography>
										</Stack>
									</Stack>
								</Stack>
							);
            })}
          </Stack>
        </Stack>
        <Stack
          direction={'row'}
          sx={{
            marginY: '0.3em',
            marginX: '0.4em',
            position: 'sticky',
            bottom: 0,
            zIndex: 1,
            bgcolor: (theme) => theme.palette.background.default,
            borderBottomLeftRadius: '1em',
            borderBottomRightRadius: '1em',
            height: '50px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <InputBase
						inputRef={inputRef}
            sx={{
              flexGrow: 1,
              color: (theme) => theme.palette.secondary.main,
              border: '1px solid #ced4da',
              padding: '0.4em',
							paddingLeft: '1em',
              borderRadius: '5em',
              borderColor: (theme) => theme.palette.divider,
              '&:hover': {
                borderColor: (theme) => theme.palette.divider,
              },
              '&.Mui-focused': {
                borderColor: (theme) => theme.palette.divider,
                boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
              },
            }}
						onKeyDown={(event) => {
							if (event.key === 'Enter' && !event.shiftKey) {
								event.preventDefault();
								onSend();
							}
						}}
            placeholder={inputRef.current?.value?.length ? undefined : 'Type a message...'}
          />
          <Button
            variant="contained"
            color="secondary"
						onClick={onSend}
            sx={{
              marginLeft: '0.5em',
              borderRadius: '0.8em',
              width: '40px',
              minWidth: '40px',
              height: '40px',
            }}
          >
            <SendIcon />
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ContentChat;
