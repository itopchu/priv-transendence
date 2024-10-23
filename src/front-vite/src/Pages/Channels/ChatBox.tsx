import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Divider,
  Stack,
  styled,
  IconButton,
  CircularProgress,
  InputBase,
  InputAdornment,
} from '@mui/material';
import {
  SendRounded as SendIcon,
  CancelScheduleSendRounded as MutedIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { User, useUser } from '../../Providers/UserContext/User';
import { CustomScrollBox, LonelyBox } from './Components/Components';
import { LoadingBox } from './Components/Components';
import { formatErrorMessage, handleError,  trimMessage } from './utils';
import { Message } from '../../Layout/Chat/InterfaceChat';
import { ChatBoxHeader } from './Headers/ChatBoxHeader';
import { MemberClient, DataUpdateType } from '../../Providers/ChannelContext/Types';
import { retryOperation, updatePropMap, } from '../../Providers/ChannelContext/utils';
import axios from 'axios';
import { StatusTypography } from './Components/ChatBoxComponents';
import MessagesBox from './MessagesBox';
import { BACKEND_URL } from '../../Providers/UserContext/User';

const ChatContainer = styled(CustomScrollBox)(({ theme }) => ({
  height: '100%',
  backgroundColor: theme.palette.primary.light,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
}));

const InputBar = styled(Box)(({ theme }) => ({
  display: 'flex',
	minWidth: '250px',
	width: '100%',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: '1em',
  backgroundColor: theme.palette.primary.dark,
  boxShadow: theme.shadows[5],
	overflowY: 'auto',
}));

function scrollToElement(ref: React.RefObject<HTMLDivElement>) {
		const element = ref.current;

		if (element) {
      element.scrollTo({
				top: element.scrollHeight,
				behavior: 'smooth',
			});
		}
}

export function useScrollTo(
	ref: React.RefObject<HTMLDivElement>,
	scrollFunc: (ref: React.RefObject<HTMLDivElement>) => void,
	dependencies: any[]
) {
	useEffect(() => {
		scrollFunc(ref);
	}, dependencies);
}

interface ChatBoxType {
  membership: MemberClient;
}

const ChatBox: React.FC<ChatBoxType> = ({ membership }) => {
	const theme = useTheme();
	const { userSocket } = useUser();

	const [searchedMsgId, setSelectedMsgId] = useState<number | undefined>(undefined);
	const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
	const [messageLog, setMessageLog] = useState<Map<number, Message>>(new Map());
	const [loading, setLoading] = useState(true);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const messagesArray = useMemo(() => Array.from(messageLog.values()), [messageLog]);

	if (!membership) return (<LonelyBox />);

	const channel = membership.channel;
	let blockedUsers: User[] = [];

	useEffect(() => {
		const controller = new AbortController;

		const getBlockedUsers = async (): Promise<User[]> => {
			const response = await axios.get(
				`${BACKEND_URL}/user/friendship/restricted`, { 
					withCredentials: true,
					signal: controller.signal,
				}
			);
			if (response.data.blockedUsers) {
				return (response.data.blockedUsers);
			}
			return ([]);
		}

    const getMessageLog = async () => {
      try {
				blockedUsers = await getBlockedUsers();

        const messages: Message[] = await retryOperation(async () => {
          const response = await axios.get(
            `${BACKEND_URL}/channel/messages/${channel.id}`, {
							withCredentials: true,
							signal: controller.signal,
						}
          );
          return response.data.messages || [];
        });

        const filteredMessages = messages
					.filter((message: Message) => (
						!blockedUsers.some((blockedUser) => blockedUser.id === message.author.id)
					))
					.sort((a: Message, b: Message) => a.id - b.id);

				const messageMap = filteredMessages.reduce((map, message) => {
					map.set(message.id, message);
					return (map);
				}, new Map<number, Message>);

        setMessageLog(messageMap);
      } catch (error) {
				if (!axios.isCancel(error)) {
					setErrorMessage(formatErrorMessage(error, 'Failed to get message log:'))
				}
      }
			setLoading(false);
    };

    function handleMessageUpdate(data: DataUpdateType<Message>) {
			const message = data.content;
			const isBlockedUser = blockedUsers.some((blockedUser) => blockedUser.id === message?.author?.id)
			if (isBlockedUser) return;

      setMessageLog((prev) => updatePropMap(prev, data))
    };

		function handleMessageError(message: string) {
			setErrorMessage(message);
			setTimeout(() => {
				setErrorMessage((currentErrorMessage) => {
					if (message === currentErrorMessage) {
						return (undefined);
					}
					return (currentErrorMessage);
				});
			}, 10000); // 10 seconds delay
		}

    userSocket?.on(`channel${channel.id}MessageUpdate`, handleMessageUpdate);
    userSocket?.on('channelMessageError', handleMessageError);
    getMessageLog();
    return () => {
			controller.abort;
			setLoading(true);
			setErrorMessage(undefined);
			setMessageLog(new Map());
      userSocket?.off(`channel${channel.id}MessageUpdate`, handleMessageUpdate);
			userSocket?.off('channelMessageError', handleMessageError);
    };
  }, [channel.id, userSocket]);

	useEffect(() => {
		if (!membership.isMuted) return;

		const element = inputRef.current;
		if (element) {
			element.value = '';
		}
	}, [membership.isMuted])

	useScrollTo(messagesEndRef, scrollToElement, [messageLog]);

  const handleSend = () => {
    if (!inputRef.current) return;

    const cleanMessage = trimMessage(inputRef.current.value);
    if (cleanMessage.length) {
      const payload = {
        message: cleanMessage,
        channelId: channel.id,
      };
      userSocket?.emit('sendChannelMessage', payload);
    }
		inputRef.current.value = '';
  };

  return (
		<>
			<ChatBoxHeader
				setSelectedMsgId={setSelectedMsgId}
				messageLog={messageLog}
			/>
			<Divider sx={{ bgcolor: theme.palette.secondary.dark }} />
			<ChatContainer>
			{loading ? (
				<LoadingBox>
					<CircularProgress size={100} />
				</LoadingBox>
			) : (
				<MessagesBox
					messageStyle='channel'
					searchedMsgId={searchedMsgId}
					messages={messagesArray}
					virtuosoStyle={{
						scrollbarColor: `${theme.palette.primary.main} ${theme.palette.secondary.dark}`
					}}
				/>
			)}
			</ChatContainer>
			<Stack
				sx={{
					flexGrow: 1,
					backgroundColor: theme.palette.primary.light,
					alignItems: 'flex-start',
					paddingBottom: '1em',
					paddingInline: '20px',
				}}
			>
				<StatusTypography
					hidden={!Boolean(errorMessage)}
					sx={{
						alignSelf: 'center',
						color: theme.palette.error.main,
					}}
				>
					{errorMessage}
				</StatusTypography>
				<InputBar>
					<InputBase
						fullWidth
						multiline
						maxRows={8}
						disabled={membership.isMuted || loading}
						inputRef={inputRef}
						inputProps={{ maxLength: 1024 }}
						placeholder={membership.isMuted ? 'You are muted...' : 'Type a message...'}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								handleSend();
							}
						}}
						sx={{
							padding: theme.spacing(1),
							'& .MuiInputBase-input': {
								'&::-webkit-scrollbar-track': {
									display: 'none',
								},
								'&::-webkit-scrollbar': {
									width: '4px',
								},
								'&::-webkit-scrollbar-thumb': {
									backgroundColor: 'transparent',
									borderRadius: '1em',
								},
							},
						}}
						endAdornment={
							<InputAdornment position='end'>
								<IconButton disabled={membership.isMuted} onClick={handleSend}>
									{membership.isMuted ? <MutedIcon /> : <SendIcon />}
								</IconButton>
							</InputAdornment>
						}
					/>
				</InputBar>
			</Stack>
		</>
  );
};

export default ChatBox;

