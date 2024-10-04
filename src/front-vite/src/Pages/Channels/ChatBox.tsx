import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Divider,
  Stack,
  styled,
  IconButton,
  CircularProgress,
  InputBase,
} from '@mui/material';
import {
  SendRounded as SendIcon,
  CancelScheduleSendRounded as MutedIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { User, useUser } from '../../Providers/UserContext/User';
import { CustomScrollBox, lonelyBox } from './Components/Components';
import { LoadingBox } from './Components/Components';
import { BACKEND_URL, formatErrorMessage, handleError,  trimMessage } from './utils';
import { Message } from '../../Layout/Chat/InterfaceChat';
import { ChatBoxHeader } from './Headers/ChatBoxHeader';
import { ChannelMember, DataUpdateType } from '../../Providers/ChannelContext/Types';
import { retryOperation, updateMap, } from '../../Providers/ChannelContext/utils';
import axios from 'axios';
import { ChatBoxMessages } from './ChatBoxMessages';
import { StatusTypography } from './Components/ChatBoxComponents';

const ChatContainer = styled(CustomScrollBox)(({ theme }) => ({
  position: 'relative',
  height: '100%',
  backgroundColor: theme.palette.primary.light,
  display: 'flex',
  flexDirection: 'column-reverse',
  padding: theme.spacing(2),
	overflowY: 'auto',
	overflowX: 'hidden',
}));

const TextBar = styled(Box)(({ theme }) => ({
  display: 'flex',
	minWidth: '250px',
	width: '100%',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: '2em',
  backgroundColor: theme.palette.primary.dark,
  boxShadow: theme.shadows[5],
	overflow: 'hidden',
}));

function filterMessages(messages: Message[], blockedUsers: User[]) {
	const filteredMessages = messages
		.filter((message: Message) => (
			!blockedUsers.some((blockedUser) => blockedUser.id === message.author.id)
		))
	return (filteredMessages);
}
interface ChatBoxType {
  membership: ChannelMember;
}

const ChatBox: React.FC<ChatBoxType> = ({ membership }) => {
	if (!membership) return (lonelyBox());

	const theme = useTheme();
	const { userSocket } = useUser();

	const [searchedMsgId, setSelectedMsgId] = useState<number | undefined>(undefined);
	const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
	const [messageLog, setMessageLog] = useState<Map<number, Message>>(new Map());
	const [loading, setLoading] = useState(true);
	const [fetching, setFetching] = useState(true);

	const searchedMsgRef = useRef<HTMLDivElement>(null);
	const msgContainerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	let controller = new AbortController();
	const channel = membership.channel;
	let blockedUsers: User[] = [];

	const loadMessages = async (cursor?: number) => {
		if (!msgContainerRef.current) return;
		setFetching(true);
		const oldScrollPosition = msgContainerRef.current.scrollHeight - msgContainerRef.current.scrollTop;
		try {

			const messages: Message[] = await retryOperation(async () => {
				const response = await axios.get(
					`${BACKEND_URL}/channel/messages/${channel.id}/${cursor ? cursor : ''}`, {
						withCredentials: true,
						signal: controller.signal,
					}
				);
				return response.data.messages || [];
			});

			setMessageLog((log) => {
				const oldMessages = Array.from(log.values());
				const newMessages = filterMessages(messages, blockedUsers);

				const newLog = ([...oldMessages, ...newMessages]).sort((a: Message, b: Message) => a.id - b.id);
				const newMap = new Map<number, Message>(newLog.map((message) => [message.id, message]));
				return (newMap);
			});
		} catch (error) {
			if (!axios.isCancel(error)) {
				setErrorMessage(formatErrorMessage('Failed to get message log: ', error))
			}
		} finally {
			const newScrollHeight = msgContainerRef.current.scrollHeight;
			requestAnimationFrame(() => {
				if (msgContainerRef.current) {
					msgContainerRef.current.scrollTop = newScrollHeight - oldScrollPosition;
					console.log(newScrollHeight - oldScrollPosition, msgContainerRef.current.scrollTop, newScrollHeight);
				}
			});
			setFetching(false);
		}
	};

	useEffect(() => {
		const getBlockedUsers = async (): Promise<User[]> => {
      try {
        const response = await axios.get(
					`${BACKEND_URL}/user/friendship/restricted`, { 
						withCredentials: true,
						signal: controller.signal,
					}
				);
				if (response.data.blockedUsers) {
					return (response.data.blockedUsers);
				}
      } catch (error) {
				if (!axios.isCancel(error)) {
					console.error(`Failed to retrieve blocked users: ${error}`);
					handleError('Failed to retrieve blocked users:', error);
				}
      }
			return ([]);
		}

		const getMessages = async () => {
			blockedUsers = await getBlockedUsers();
			loadMessages();
		}

    function handleMessageUpdate(data: DataUpdateType<Message>) {
			const message = data.content;
			const isBlockedUser = blockedUsers.some((blockedUser) => blockedUser.id === message?.author.id)
			if (isBlockedUser) return;

      setMessageLog((prev) => updateMap(prev, data))
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
			}, 60000); // 1 min delay
		}

		getMessages();
    userSocket?.on(`newChannel${channel.id}MessageUpdate`, handleMessageUpdate);
    userSocket?.on('channelMessageError', handleMessageError);
		setLoading(false);
    return () => {
			controller.abort;
			controller = new AbortController();
			setLoading(true);
			setMessageLog(new Map());
      userSocket?.off(`newChannel${channel.id}MessageUpdate`);
			userSocket?.off('channelMessageError', handleMessageError);
    };
  }, [channel.id, userSocket]);

	//useEffect(() => {
	//	const element = msgContainerRef.current;
	//
	//	if (element && element.scrollTop === 0) {
	//		console.log(element.scrollTop);
	//		element.scrollTo({
	//			top: element.scrollHeight,
	//			behavior: 'smooth',
	//		});
	//	}
	//}, [messageLog]);

//useEffect(() => {
//	const element = searchedMsgRef.current;
//
//	if (element) {
//    element.scrollIntoView({
//			behavior: 'smooth',
//			block: 'center',
//		});
//	}
//}, [searchedMsgRef.current]);

	let prevScrollTop: number = 0;
	const handleScroll = () => {
		if (!msgContainerRef.current) return;
		const { scrollTop, scrollHeight, clientHeight } = msgContainerRef.current;

		console.log(msgContainerRef.current.scrollTop);
		if (prevScrollTop > scrollTop && -scrollTop + clientHeight + 50 >= scrollHeight && !fetching && !loading) {
			const [id, _] = messageLog.entries().next().value as [number, Message];
			loadMessages(id)
		}
		prevScrollTop = scrollTop
	}

  const handleSend = () => {
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

  const renderMessages = () => {
    if (!messageLog.size) return (null);

		const messages = Array.from(messageLog.values());
    return (
			<ChatBoxMessages
				ref={searchedMsgRef}
				searchedMsgId={searchedMsgId}
				messages={messages}
			/>
		);
  };

  return (
		<>
			<ChatBoxHeader
				setSelectedMsgId={setSelectedMsgId}
				messageLog={messageLog}
			/>
			<Divider sx={{ bgcolor: theme.palette.secondary.dark }} />
			<ChatContainer
				ref={msgContainerRef}
				onScroll={handleScroll}
			>
				<Stack
					sx={{
						paddingInline: theme.spacing(2)
					}}
				>
					{renderMessages()}
				</Stack>
				{(loading || fetching) && (
					<LoadingBox>
						<CircularProgress size={100} />
					</LoadingBox>
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
				<TextBar>
					<InputBase
						fullWidth
						multiline
						maxRows={4}
						disabled={membership.isMuted || loading}
						inputRef={inputRef}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								handleSend();
							}
						}}
						placeholder={membership.isMuted ? 'You are muted...' : 'Type a message...'}
					/>
					<IconButton disabled={membership.isMuted || loading} onClick={handleSend}>
						{membership.isMuted ? <MutedIcon /> : <SendIcon />}
					</IconButton>
				</TextBar>
			</Stack>
		</>
  );
};

export default ChatBox;

