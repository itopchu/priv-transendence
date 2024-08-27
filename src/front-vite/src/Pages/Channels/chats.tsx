import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Divider,
  Avatar,
  Typography,
  Stack,
  styled,
  IconButton,
} from '@mui/material';
import { Message, SendRounded as SendIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { User, useUser } from '../../Providers/UserContext/User';
import { Channel } from './channels';
import axios from 'axios';

const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';

const formatDate = (timestamp: Date): string => {
	const now: Date = new Date();
	const date: Date = new Date(timestamp);
	let formattedDate: string;

	const formattedTime = date.toLocaleTimeString([],
		{ hour: '2-digit', minute: '2-digit' }
	);
	formattedDate = date.toLocaleDateString('en-UK', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
	if (now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth()) {
		const dayNow = now.getDate();
		const dayDate = date.getDate();

		if (dayNow === dayDate) {
			formattedDate = 'today at';
		} else if (dayNow - 1 === dayDate) {
			formattedDate = 'yesterday at';
		}
	}
	return (`${formattedDate} ${formattedTime}`);
}

const getTimeDiff = (timestamp1: Date, timestamp2: Date) => {
	const date1 = new Date(timestamp1);
	const date2 = new Date(timestamp2);

	return (date1.getTime() - date2.getTime());
}

const ChatContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: '80vh',
  backgroundColor: theme.palette.primary.light,
  display: 'flex',
  flexDirection: 'column-reverse',
  padding: theme.spacing(2),
}));

const ChatBubble = styled(Box)(({ theme }) => ({
  display: 'inline-block',
  backgroundColor: theme.palette.secondary.dark,
  borderRadius: '1.5em',
  alignSelf: 'flex-start',
  padding: '6px 1em',
  wordBreak: 'break-word',
}));

const ChatMessages = styled(Stack)(({ theme }) => ({
  flex: -1,
  overflow: 'auto',
  padding: theme.spacing(2),
}));

const TextBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: '2em',
  backgroundColor: theme.palette.primary.dark,
  bottom: theme.spacing(2),
  boxShadow: theme.shadows[5],
}));

interface ChatBoxType {
	channel: Channel;
}

type Message = {
	id: number,
	content: string,
	author: User,
	timestamp: Date,
}

const ChatBox: React.FC<ChatBoxType> = ({ channel }) => {
  const [messageLog, setMessageLog] = useState<Message[]>([]);
  const { userSocket } = useUser();
  const theme = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
	const getMessageLog = async () => {
		try {
			const response = await axios.get(`${BACKEND_URL}/channel/messages/${channel.id}`, { withCredentials: true });
			if (response.data.messages)
				setMessageLog(response.data.messages.reverse());
		} catch(error) {
			console.error(error);
		}

		const onMessage = (message: Message) => {
		  setMessageLog((prevMessages) => [...prevMessages, message]);
		}

		userSocket?.on(`room${channel.id}Message`, onMessage);

		return () => {
			userSocket?.off(`room${channel.id}Message`, onMessage);
		}
	}
	getMessageLog();
  }, [channel.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messageLog]);

  const onSend = () => {
    const cleanMessage = inputRef.current?.value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');

    if (cleanMessage) {
	  const payload = {
		  message: cleanMessage,
		  channelId: channel.id
	  };
	  userSocket?.emit('message', payload);
    }
	if (inputRef.current)
		inputRef.current.value = '';
  };

  const generateMessages = () => {
    if (!messageLog.length) return null;
	const timeLimit = 3 * 60 * 1000; // 5 min in milisecondes

    return (
      <ChatMessages>
        {messageLog.map((msg, index) => {
				const isFirstMessage = index === 0;
				const isLastMessage = index + 1 === messageLog.length;
				const prevIsDiffTime = isFirstMessage || getTimeDiff(msg.timestamp, messageLog[index - 1].timestamp) > timeLimit;
				const isDiffTime = isLastMessage || getTimeDiff(messageLog[index +  1].timestamp, msg.timestamp) > timeLimit;
				const isDifferentUser = isFirstMessage || messageLog[index - 1].author.id !== msg.author.id;
				const isLastUserMessage = isLastMessage || messageLog[index + 1].author.id !== msg.author.id;
				const username = msg.author?.nameNick ? msg.author.nameNick : msg.author?.nameFirst;
				const timestamp = formatDate(msg.timestamp);

		return (
          <React.Fragment key={index}>
            <Divider
              sx={{
                alignSelf: 'flex-start',
                backgroundColor: theme.palette.primary.light,
              }}
            />
            <Stack
              key={index}
              direction="row"
              spacing={1}
              paddingLeft={isDifferentUser || prevIsDiffTime ? 0 : 7.3}
			  paddingTop={isDifferentUser || prevIsDiffTime ? 2 : 0}
              alignItems="flex-start"
            >
              {(isDifferentUser || prevIsDiffTime) && (
                <Avatar sx={{ width: 50, height: 50 }} src={`${BACKEND_URL}/${msg.author?.image}`} />
              )}
              <Stack>
                {(isDifferentUser || prevIsDiffTime) && (
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 'bold', fontSize: 'medium' }}
                  >
                    {username}
                    <Typography
                        variant="caption"
                        sx={{ fontSize: '0.7em', paddingLeft: '1em' }}
                      >
                        {`${timestamp}`}
                      </Typography>
                  </Typography>
                )}

                <ChatBubble
                  sx={{
                    borderTopLeftRadius: isDifferentUser || prevIsDiffTime ? '' : '0.2em',
                    borderBottomLeftRadius: isLastUserMessage || isDiffTime ? '' : '0.2em',
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ whiteSpace: 'pre-line' }}
                  >
                    {msg.content}
                  </Typography>
                </ChatBubble>
              </Stack>
            </Stack>
          </React.Fragment>
        )
		})}
      </ChatMessages>
    );
  };
	
  return (
    <ChatContainer>
      <TextBar>
        <TextField
          variant="standard"
          fullWidth
          multiline
          maxRows={4}
          InputProps={{
            disableUnderline: true,
            sx: {
              color: 'white',
              padding: '7px',
            },
          }}
          inputRef={inputRef}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Type a message..."
        />
        <IconButton onClick={onSend}>
          <SendIcon />
        </IconButton>
      </TextBar>
      {generateMessages()}
      <div ref={messagesEndRef} />
    </ChatContainer>
  );
};

export default ChatBox;
