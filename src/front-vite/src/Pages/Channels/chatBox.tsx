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
  SendRounded as SendIcon,
  CancelScheduleSendRounded as MutedIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { User, useUser } from '../../Providers/UserContext/User';
import { Channel } from '../../Providers/ChannelContext/Channel';
import { ButtonAvatar, ClickTypography, CustomScrollBox, lonelyBox, ChatBubble } from './Components/Components';
import { useNavigate } from 'react-router-dom';
import { LoadingBox } from './Components/CardComponents';
import { BACKEND_URL, getUsername, handleError, retryOperation, trimMessage } from './utils';
import { Message } from '../../Layout/Chat/InterfaceChat';
import axios from 'axios';

type formatDateType = {
	date: string;
	particle: string;
	time: string;
};

export function formatDate(timestamp: Date): formatDateType {
  const now: Date = new Date();
  const date: Date = new Date(timestamp);
	let particle: string = '';

  const formattedTime = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  let formattedDate = date.toLocaleDateString('en-UK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth()
  ) {
    const dayNow = now.getDate();
    const dayDate = date.getDate();

    if (dayNow === dayDate) {
      formattedDate = 'Today';
			particle = 'at';
    } else if (dayNow - 1 === dayDate) {
      formattedDate = 'Yesterday';
			particle = 'at';
    }
  }
  return { date: formattedDate, particle, time: formattedTime };
};

export function getTimeDiff(timestamp1: Date, timestamp2: Date) {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);

	if (timestamp1 > timestamp2) {
		return (date1.getTime() - date2.getTime());
	}
	return (date2.getTime() - date1.getTime());
};

function isDiffDate(date1: Date, date2: Date): boolean {
  const normalizedDate1 = new Date(date1);
  const normalizedDate2 = new Date(date2);
  normalizedDate1.setHours(0, 0, 0, 0);
  normalizedDate2.setHours(0, 0, 0, 0);

  return (normalizedDate1.getTime() !== normalizedDate2.getTime());
}

const ChatContainer = styled(CustomScrollBox)(({ theme }) => ({
  position: 'relative',
  height: '80vh',
  backgroundColor: theme.palette.primary.light,
  display: 'flex',
  flexDirection: 'column-reverse',
  padding: theme.spacing(2),
}));

const ChatMessages = styled(Stack)(({ theme }) => ({
  flex: -1,
  padding: theme.spacing(2),
}));

const TextBar = styled(Box)(({ theme }) => ({
  display: 'flex',
	position: 'sticky',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: '2em',
  backgroundColor: theme.palette.primary.dark,
  boxShadow: theme.shadows[5],
}));

interface ChatBoxType {
  channel: Channel;
}

const ChatBox: React.FC<ChatBoxType> = ({ channel }) => {
	if (!channel) return (lonelyBox());

  const navigate = useNavigate();
  const theme = useTheme();
  const { user, userSocket } = useUser();

  const [messageLog, setMessageLog] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

	const blockedUsersRef = useRef<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMuted = channel.mutedUsers?.some(
    (mutedUser) => mutedUser.userId === user.id
  );

  useEffect(() => {
		const getBlockedUsers = async (): Promise<User[]> => {
      try {
        const response = await axios.get(`${BACKEND_URL}/user/friendship/restricted`, { withCredentials: true });
				if (response.data.blockedUsers) {
					return (response.data.blockedUsers);
				}
      } catch (error) {
        console.error(`Failed to retrieve blocked users:${error}`);
				handleError('nice', error);
      }
			return ([]);
		}

    const getMessageLog = async () => {
      try {
				blockedUsersRef.current = await getBlockedUsers();

        const messageLog = await retryOperation(async () => {
          const response = await axios.get(
            `${BACKEND_URL}/channel/messages/${channel.id}`,
            { withCredentials: true }
          );
          return response.data.messages || [];
        });
        messageLog
					.filter((message: Message) => (
						!blockedUsersRef.current.some((blockedUser) => blockedUser.id === message.author.id)
					))
					.sort((a: Message, b: Message) => a.id - b.id);

        setMessageLog(messageLog);
				setLoading(false);
      } catch (error: any) {
        handleError('Unable to get message log:', error);
      }
    };

    const onMessage = (message: Message) => {
			const isBlockedUser = blockedUsersRef.current.some((blockedUser) => blockedUser.id === message.author.id)
			if (isBlockedUser) return;

      setMessageLog((prevMessages) => [...prevMessages, message]);
    };

    getMessageLog();
    userSocket?.on(`channel#${channel.id}Message`, onMessage);
    userSocket?.on(`messageError`, (errMessage: string) => handleError(errMessage, null));
    return () => {
			setLoading(true);
      userSocket?.off(`channel#${channel.id}Message`, onMessage);
    };
  }, [channel.id, userSocket]);

  useEffect(() => {
    const element = messagesEndRef.current;

    if (element) {
      element.scrollTo({
				top: element.scrollHeight,
				behavior: 'smooth',
			});
    }
  }, [messageLog]);

  const onSend = () => {
    if (!inputRef.current) return;

    const cleanMessage = trimMessage(inputRef.current.value);
    if (cleanMessage.length) {
      const payload = {
        message: cleanMessage,
        channelId: channel.id,
      };
      userSocket?.emit('message', payload);
    }
		inputRef.current.value = '';
  };

  const generateMessages = () => {
    if (!messageLog.length) return undefined;
    const timeSeparation = 2 * 60 * 1000; // 2 min in milisecondes

    return (
      <>
        {messageLog.map((msg, index) => {
          const isFirstMessage = index === 0;
          const isLastMessage = index + 1 === messageLog.length;

          const isDiffTime = isLastMessage
						|| getTimeDiff(messageLog[index + 1].timestamp, msg.timestamp) > timeSeparation;
          const isPrevDiffTime = isFirstMessage
						|| getTimeDiff(msg.timestamp, messageLog[index - 1].timestamp) > timeSeparation;
					const isDiffDay = isFirstMessage || isDiffDate(msg.timestamp, messageLog[index - 1].timestamp);

          const isDifferentUser = isFirstMessage || messageLog[index - 1].author.id !== msg.author.id;
          const isLastUserMessage = isLastMessage || messageLog[index + 1].author.id !== msg.author.id;

          const isNewMsgBlock = isDifferentUser || isPrevDiffTime;

          const username = getUsername(msg.author);
          const timestamp = formatDate(msg.timestamp);

          return (
            <React.Fragment key={index}>
							{isDiffDay && (
								<Box flexGrow={1} paddingTop={3} >
									<Divider sx={{ color: 'text.secondary' }} >
										{timestamp.date}
									</Divider>
								</Box>
							)}
              <Divider
                sx={{
                  alignSelf: 'flex-start',
                  backgroundColor: theme.palette.primary.light,
                }}
              />
              <Stack
                key={index}
                direction={'row'}
                spacing={1}
                minWidth={'17em'}
                paddingTop={isNewMsgBlock ? 3 : 0}
                alignItems="flex-start"
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, .05)',
                  },
                  '&:hover .hidden-timestamp': {
                    visibility: 'visible',
                  },
                }}
              >
                {isNewMsgBlock ? (
                  <ButtonAvatar
                    clickEvent={() => {
                      navigate(`/profile/${msg.author.id}`);
                    }}
                    avatarSx={{ width: 50, height: 50, border: '0px' }}
                    sx={{ boxShadow: theme.shadows[5] }}
                    src={msg.author?.image}
                  />
                ) : (
									<Box
										sx={{
											display: 'flex',
											alignItems: 'flex-end',
											justifyContent: 'center',
											height: '100%',
											flexGrow: 1,
											minWidth: 50,
											maxWidth: 50,
										}}
									>
										<Typography
											className="hidden-timestamp"
											variant="caption"
											color={'textSecondary'}
											sx={{
												fontSize: '0.55em',
												visibility: 'hidden',
											}}
										>
											{timestamp.time}
										</Typography>
									</Box>
                )}

                <Stack spacing={0.4} flexGrow={1}>
                  {isNewMsgBlock && (
                    <Stack flexDirection="row">
                      <ClickTypography
                        paddingLeft={2}
                        variant="h3"
                        onClick={() => {
                          navigate(`/profile/${msg.author.id}`);
                        }}
                        sx={{ fontWeight: 'bold', fontSize: 'medium' }}
                      >
                        {username}
                      </ClickTypography>
                      <Typography
                        variant="caption"
                        color={'textSecondary'}
												whiteSpace={'nowrap'}
                        sx={{
													fontSize: '0.7em',
													paddingLeft: '1em'
												}}
                      >
                        {`${timestamp.date} ${timestamp.particle} ${timestamp.time}`}
                      </Typography>
                    </Stack>
                  )}

                  <Stack flexDirection={'row'}>
                    <ChatBubble
                      sx={{
												backgroundColor: user.id === msg.author.id ? undefined : '#7280ce',
                        borderTopLeftRadius: isNewMsgBlock ? undefined : '0.2em',
                        borderBottomLeftRadius: isLastUserMessage || isDiffTime ? undefined : '0.2em',
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
              </Stack>
            </React.Fragment>
          );
        })}
      </>
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
              placeholder={isMuted ? 'You are muted...' : 'Type a message...'}
            />
            <IconButton disabled={isMuted} onClick={onSend}>
              {isMuted ? <MutedIcon /> : <SendIcon />}
            </IconButton>
          </TextBar>
          <ChatMessages ref={messagesEndRef}>{generateMessages()}</ChatMessages>
        </>
      )}
    </ChatContainer>
  );
};

export default ChatBox;

