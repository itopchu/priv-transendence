import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Divider,
  Typography,
  Stack,
  styled,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Message,
  SendRounded as SendIcon,
  CancelScheduleSendRounded as MutedIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { User, useUser } from '../../Providers/UserContext/User';
import { Channel, handleError, retryOperation, useChannel } from './channels';
import axios from 'axios';
import { ButtonAvatar, ClickTypography } from './Components';
import { useNavigate } from 'react-router-dom';
import { LoadingBox } from './CardComponents';

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
  backgroundColor: theme.palette.primary.main,
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
  const navigate = useNavigate();
  const theme = useTheme();
  const { userSocket } = useUser();
  const { memberships } = useChannel();

  const [messageLog, setMessageLog] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isMuted = memberships.find((membership) => membership.channel.id === channel.id)?.muted;

  useEffect(() => {
	const onMessage = (message: Message) => {
	  //if (user.blockList.includes(message.author.id)) {
	  //    return;
	  //}
	  setMessageLog((prevMessages) => [...prevMessages, message]);
	}

	const getMessageLog = async () => {
		try {
			const fetchedMessageLog = await retryOperation(async () => {
			  const response = await axios.get(`${BACKEND_URL}/channel/messages/${channel.id}`, { withCredentials: true });
			  return (response.data.messages || []);
			});
			fetchedMessageLog.sort((a: Message, b: Message) => a.id - b.id)
				//.filter((message: Message) => !user.blockList.includes(message.author.id));

			setMessageLog(fetchedMessageLog);
		} catch(error: any) {
			handleError('Unable to fetch message log:', error);
		}
	}

	getMessageLog();
	userSocket?.on(`channel#${channel.id}Message`, onMessage);
	setLoading(false);
	return () => {
		userSocket?.off(`channel#${channel.id}Message`, onMessage);
	}
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
	if (inputRef.current) {
		inputRef.current.value = '';
	}
  };

  const generateMessages = () => {
    if (!messageLog.length) return null;
	const timeSeparation = 3 * 60 * 1000; // 5 min in milisecondes

    return (
      <ChatMessages>
        {messageLog.map((msg, index) => {
				const isFirstMessage = index === 0;
				const isLastMessage = index + 1 === messageLog.length;
				const prevIsDiffTime = isFirstMessage || getTimeDiff(msg.timestamp, messageLog[index - 1].timestamp) > timeSeparation;
				const isDiffTime = isLastMessage || getTimeDiff(messageLog[index +  1].timestamp, msg.timestamp) > timeSeparation;
				const isDifferentUser = isFirstMessage || messageLog[index - 1].author.id !== msg.author.id;
				const isLastUserMessage = isLastMessage || messageLog[index + 1].author.id !== msg.author.id;
				const username = msg.author?.nameNick ? msg.author.nameNick : `${msg.author?.nameFirst} ${msg.author?.nameLast}`;
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
                <ButtonAvatar
					clickEvent={() => {navigate(`/profile/${msg.author.id}`)}}
					avatarSx={{ width: 50, height: 50, border: '0px' }}
					sx={{ boxShadow: theme.shadows[5], }}
					src={`${BACKEND_URL}/${msg.author?.image}`}
				/>
              )}
              <Stack spacing={.4} >
                {(isDifferentUser || prevIsDiffTime) && (
					<Stack flexDirection='row' >
					  <ClickTypography
						paddingLeft={2}
						variant="h3"
						onClick={() => {navigate(`/profile/${msg.author.id}`)}}
						sx={{ fontWeight: 'bold', fontSize: 'medium' }}
					  >
						{username}
					  </ClickTypography>
					  <Typography
						variant="caption"
						color={'textSecondary'}
						sx={{ fontSize: '0.7em', paddingLeft: '1em' }}
				      >
						{`${timestamp}`}
					  </Typography>
					</Stack>
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
	  {loading ? (
		<LoadingBox>
			<CircularProgress size={100} />
		</LoadingBox>
	  ) : (
	  <>
		  <TextBar>
			<TextField
			  variant="standard"
			  fullWidth
			  multiline
			  maxRows={4}
			  disabled={isMuted}
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
			  placeholder={isMuted ? "You are muted..." : "Type a message..."}
			/>
			<IconButton disabled={isMuted} onClick={onSend}>
			  {isMuted ? <MutedIcon /> : <SendIcon />}
			</IconButton>
		  </TextBar>
		  {generateMessages()}
		  <div ref={messagesEndRef} />
	  </>
	  )}
    </ChatContainer>
  );
};

export default ChatBox;
