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
import { BACKEND_URL, handleError,  trimMessage } from './utils';
import { Message } from '../../Layout/Chat/InterfaceChat';
import { ChatBoxHeader } from './Headers/ChatBoxHeader';
import { ChannelMember, DataUpdateType } from '../../Providers/ChannelContext/Types';
import { retryOperation, updateMap, } from '../../Providers/ChannelContext/utils';
import axios from 'axios';
import { ChannelMessages } from './ChannelMessages';

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

interface ChatBoxType {
  membership: ChannelMember;
}

const ChatBox: React.FC<ChatBoxType> = ({ membership }) => {
	if (!membership) return (lonelyBox());

  const theme = useTheme();
  const { userSocket } = useUser();

  const [messageLog, setMessageLog] = useState<Map<number, Message>>(new Map());
  const [loading, setLoading] = useState(true);

	const blockedUsersRef = useRef<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

	const channel = membership.channel;

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

        const messages: Message[] = await retryOperation(async () => {
          const response = await axios.get(
            `${BACKEND_URL}/channel/messages/${channel.id}`,
            { withCredentials: true }
          );
          return response.data.messages || [];
        });

        const filteredMessages = messages
					.filter((message: Message) => (
						!blockedUsersRef.current.some((blockedUser) => blockedUser.id === message.author.id)
					))
					.sort((a: Message, b: Message) => a.id - b.id);

				const messageMap = filteredMessages.reduce((map, message) => {
					map.set(message.id, message);
					return (map);
				}, new Map<number, Message>);

        setMessageLog(messageMap);
      } catch (error: any) {
        handleError('Unable to get message log:', error);
      }
    };

    const handleMessageUpdate = (data: DataUpdateType<Message>) => {
			const message = data.content;
			const isBlockedUser = blockedUsersRef.current.some((blockedUser) => blockedUser.id === message?.author.id)
			if (isBlockedUser) return;

      setMessageLog((prev) => updateMap(prev, data))
    };

    getMessageLog();
		setLoading(false);
    userSocket?.on('newChannelMessageUpdate', handleMessageUpdate);
    userSocket?.on('messageError', (errMessage: string) => handleError(errMessage, null));
    return () => {
			setLoading(true);
			setMessageLog(new Map());
      userSocket?.off('newChannelMessageUpdate');
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
			<ChannelMessages messages={messages} />
		);
  };

  return (
		<>
			<ChatBoxHeader/>
			<Divider sx={{ bgcolor: theme.palette.secondary.dark }} />
			<ChatContainer>
				{loading ? (
					<LoadingBox>
						<CircularProgress size={100} />
					</LoadingBox>
				) : (
					<Stack
						sx={{ paddingInline: theme.spacing(2) }}
						ref={messagesEndRef}
					>
						{renderMessages()}
					</Stack>
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
					<IconButton disabled={membership.isMuted} onClick={handleSend}>
						{membership.isMuted ? <MutedIcon /> : <SendIcon />}
					</IconButton>
				</TextBar>
			</Stack>
		</>
  );
};

export default ChatBox;

