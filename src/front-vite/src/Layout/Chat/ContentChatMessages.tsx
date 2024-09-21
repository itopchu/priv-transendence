import React from "react";
import { formatDate, getTimeDiff } from "../../Pages/Channels/chatBox";
import { Message } from "./InterfaceChat";
import { Box, Divider, Stack, Typography, useTheme } from "@mui/material";
import { ButtonAvatar, ChatBubble } from "../../Pages/Channels/Components/Components";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../Providers/UserContext/User";

type ChatBoxType = {
	messageLog: Message[];
}

export const PendingMessages: React.FC<{ messages: Message[] }> = ({ messages }) => {
	if (!messages.length) return (null);

	return (
		<>
			{messages.map((msg, index) => {
				<Stack
					key={index}
					flexGrow={1}
					flexDirection={'row-reverse'}
				>
					<ChatBubble
						sx={{
							backgroundColor: 'gray',
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
			})}
		</>
	);
}

export const ContentChatMessages: React.FC<ChatBoxType> = ({ messageLog }) => {
	if (!messageLog.length) return (undefined);

	const { user } = useUser();
  const navigate = useNavigate();
	const theme = useTheme();

	const timeSeparation = 10 * 60 * 1000; // 10 min in milisecondes

	return (
		<>
			{messageLog.map((msg, index) => {
				const isFirstMessage = index === 0;
				const isLastMessage = index + 1 === messageLog.length;

				const isDiffTime = isLastMessage
					|| getTimeDiff(messageLog[index + 1].timestamp, msg.timestamp) > timeSeparation;
				const isPrevDiffTime = isFirstMessage
					|| getTimeDiff(msg.timestamp, messageLog[index - 1].timestamp) > timeSeparation;

				const isDifferentUser = isFirstMessage || messageLog[index - 1].author.id !== msg.author.id;
				const isLocalUser = msg.author.id === user.id;
				const isLastUserMessage = isLastMessage || messageLog[index + 1].author.id !== msg.author.id;

				const isNewMsgBlock = isDifferentUser || isPrevDiffTime;
				const isMsgBlockEnd = isLastUserMessage || isDiffTime;

				const timestamp = formatDate(msg.timestamp);

				return (
					<React.Fragment key={msg.id}>
						{isPrevDiffTime && (
							<Box flexGrow={1} paddingTop={3} >
								<Divider sx={{ color: 'text.secondary' }} >
									{`${timestamp.date} ${timestamp.particle} ${timestamp.time}`}
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
							direction={'row'}
							spacing={1}
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
							{isMsgBlockEnd && !isLocalUser && (
								<ButtonAvatar
									clickEvent={() => {
										navigate(`/profile/${msg.author.id}`);
									}}
									avatarSx={{ width: '36px', height: '36px', border: '0px' }}
									sx={{ boxShadow: theme.shadows[5] }}
									src={msg.author?.image}
								/>
							)}

							<Stack
								paddingLeft={isLocalUser || isMsgBlockEnd ? 0 : 5.5}
								justifyContent={'space-between'}
								flexGrow={1}
								flexDirection={isLocalUser ? 'row-reverse' : 'row'}
							>
								<ChatBubble
									sx={{
										backgroundColor: isLocalUser ? undefined : '#7280ce',
										borderTopLeftRadius: isLocalUser || isNewMsgBlock ? undefined : '0.2em',
										borderBottomLeftRadius: isLocalUser || isMsgBlockEnd ? undefined : '0.2em',
										borderTopRightRadius: !isLocalUser || isNewMsgBlock ? undefined : '0.2em',
										borderBottomRightRadius: !isLocalUser || isMsgBlockEnd ? undefined : '0.2em',
									}}
								>
									<Typography
										variant="body1"
										sx={{ whiteSpace: 'pre-line' }}
									>
										{msg.content}
									</Typography>
								</ChatBubble>
								<Typography
									className="hidden-timestamp"
									variant="caption"
									color={'textSecondary'}
									alignSelf={'flex-end'}
									sx={{
										fontSize: '0.55em',
										paddingInline: '5px',
										minWidth: '50px',
										visibility: 'hidden',
									}}
								>
									{timestamp.time}
								</Typography>
							</Stack>
						</Stack>
					</React.Fragment>
				);
			})}
		</>
	);
};

