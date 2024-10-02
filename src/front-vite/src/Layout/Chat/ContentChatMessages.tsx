import React, { useRef, useState } from "react";
import { Message } from "./InterfaceChat";
import { Box, Divider, Stack, Typography, useTheme } from "@mui/material";
import { ButtonAvatar } from "../../Pages/Channels/Components/Components";
import { NavigateFunction } from "react-router-dom";
import { useUser } from "../../Providers/UserContext/User";
import { formatDate, getTimeDiff } from "../../Providers/ChannelContext/utils";
import {
	MsgContextMenu,
	ChatBubble,
	handleDeleteMessage,
	handleMsgEdit,
	useEditCancel,
	useEditMsg,
	ChatBubbleInputBase,
	StatusTypography
} from "../../Pages/Channels/Components/ChatBoxComponents";
import { HiddenTimestamp } from "../../Pages/Channels/Components/ChatBoxComponents";

type ChatBoxType = {
	messages: Message[];
	navigate: NavigateFunction;
}

export const PendingMessages: React.FC<{ messages: Message[] }> = ({ messages }) => {
	if (!messages.length) return (null);

	return (
		<>
			{messages.map((msg, index) => (
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
			))}
		</>
	);
}


const timeSeparation = 3 * 60 * 1000; // 2 min in milisecondes
const oneHour = 60 * 60 *  1000;
export const ContentChatMessages: React.FC<ChatBoxType> = ({ messages, navigate }) => {
	if (!messages.length) return;

	const { user: localUser } = useUser();
	const theme = useTheme();
	const editMsgRef = useRef<HTMLInputElement>();

	const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null >(null);
	const [selectedMessage, setSelectedMessage] = useState<Message | undefined>(undefined);
	const [menuId, setMenuId] = useState<number | null>(null);
	const [editMode, setEditMode] = useState<boolean>(false);

	const resetEdit = () => {
		setEditMode(false);
		setSelectedMessage(undefined);
	}

	useEditMsg(editMsgRef, selectedMessage);
	useEditCancel(editMode, resetEdit);

	const enableEditMode = (msg: Message) => {
		setSelectedMessage(msg);
		setEditMode(true);
		handleClose();
	}

	const deleteMessage = (msgId: number) => {
		handleDeleteMessage(msgId, handleClose)
		setSelectedMessage(undefined);
	}

	const openContextMenu = (event: React.MouseEvent<HTMLElement>, msg: Message) => {
		if (msg.author.id !== localUser.id || (editMode && selectedMessage?.id === msg.id)) return;

		event.preventDefault();
		setMousePosition({
			x: event.clientX,
			y: event.clientY,
		});
		setMenuId(msg.id);
	}

	const handleInputChange = (event: React.KeyboardEvent<HTMLElement>) =>  {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			if (selectedMessage && editMsgRef.current) {
				handleMsgEdit(selectedMessage.id, editMsgRef.current.value, resetEdit);
			}
		}
	}

	const handleClose = () => {
		setMousePosition(null);
		setMenuId(null);
	}

	return (
		<>
			{messages.map((msg, index) => {
				const isFirstMessage = index === 0;
				const isLastMessage = index + 1 === messages.length;

				const isDiffTime = isLastMessage
					|| getTimeDiff(messages[index + 1].timestamp, msg.timestamp) > timeSeparation;
				const isPrevDiffTime = isFirstMessage
					|| getTimeDiff(msg.timestamp, messages[index - 1].timestamp) > timeSeparation;
				const isDiffHour = isFirstMessage
					|| getTimeDiff(msg.timestamp, messages[index - 1].timestamp) > oneHour;

				const isDifferentUser = isFirstMessage || messages[index - 1].author.id !== msg.author.id;
				const isLocalUser = msg.author.id === localUser.id;
				const isEditing = editMode && selectedMessage?.id === msg.id;
				const isLastUserMessage = isLastMessage || messages[index + 1].author.id !== msg.author.id;

				const isNewMsgBlock = isDifferentUser || isPrevDiffTime;
				const isMsgBlockEnd = isLastUserMessage || isDiffTime;

				const timestamp = formatDate(msg.timestamp);

				return (
					<React.Fragment key={msg.id}>
						<MsgContextMenu
							open={Boolean(mousePosition) && menuId === msg.id}
							anchorPosition={mousePosition ? { left: mousePosition.x, top: mousePosition.y } : undefined}
							onClose={handleClose}
							onEditClick={() => enableEditMode(msg)}
							onDeleteClick={() => deleteMessage(msg.id)}
						/>
						{isDiffHour && (
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
							paddingTop={isNewMsgBlock ? 1 : 0}
							alignItems="flex-start"
							onContextMenu={(event) => openContextMenu(event, msg)}
							sx={{
								backgroundColor: isEditing || menuId === msg.id
									? 'rgba(255, 255, 255, .05)' : undefined,
								'&:hover': {
									backgroundColor: 'rgba(255, 255, 255, .05)',
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
										flexGrow: isEditing ? 1 : undefined,
									}}
								>
									<Stack spacing={-.5} display={isEditing ? 'none' : 'flex'} >
										<Typography
											variant="body1"
											sx={{ whiteSpace: 'pre-line' }}
										>
											{msg.content}
										</Typography>
										<StatusTypography
											sx={{ 
												alignSelf: isLocalUser ? 'flex-start' : 'flex-end',
												display: msg.edited ? 'block' : 'none'
											}}
										>
											(edited)
										</StatusTypography>
									</Stack>

									{isEditing && (
										<ChatBubbleInputBase
											multiline
											inputRef={editMsgRef}
											onKeyDown={handleInputChange}
										/>
									)}
								</ChatBubble>

								<HiddenTimestamp
									timestamp={timestamp.time}
									sx={{
										alignSelf: 'flex-end',
										paddingInline: '5px',
										minWidth: '50px',
									}}
								/>
							</Stack>
						</Stack>
					</React.Fragment>
				);
			})}
		</>
	);
};

