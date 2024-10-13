import React, { useRef, useState } from "react";
import { Message } from "./InterfaceChat";
import { Box, Divider, Stack, SxProps, Theme, Typography, useTheme } from "@mui/material";
import { ButtonAvatar } from "../../Pages/Channels/Components/Components";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../Providers/UserContext/User";
import { acceptInvite, formatDate, getLink, getTimeDiff, INVITE_DOMAIN } from "../../Providers/ChannelContext/utils";
import {
	MsgContextMenu,
	ChatBubble,
	handleDeleteMessage,
	handleMsgEdit,
	useEditCancel,
	useEditMsg,
	ChatBubbleInputBase,
	StatusTypography,
	InviteMessage
} from "../../Pages/Channels/Components/ChatBoxComponents";
import { HiddenTimestamp } from "../../Pages/Channels/Components/ChatBoxComponents";
import { handleError } from "../../Pages/Channels/utils";
import { Invite } from "../../Providers/ChannelContext/Types";
import { useChannel } from "../../Providers/ChannelContext/Channel";

type ChatBoxType = {
	messages: Message[];
}

const timeSeparation = 3 * 60 * 1000; // 2 min in milisecondes
const oneHour = 60 * 60 *  1000;
export const ContentChatMessages: React.FC<ChatBoxType> = ({ messages }) => {
	const { user: localUser, userSocket } = useUser();
	const { channelProps, setChannelProps } = useChannel();
	const navigate = useNavigate();
	const theme = useTheme();
	const editMsgRef = useRef<HTMLInputElement>();

	const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null >(null);
	const [selectedMessage, setSelectedMessage] = useState<Message | undefined>(undefined);
	const [menuId, setMenuId] = useState<number | null>(null);
	const [editMode, setEditMode] = useState<boolean>(false);

	if (!messages.length) return (<></>);

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

	const copyMessage = async (msg: Message) => {
		await navigator.clipboard.writeText(msg.content);
		handleClose();
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

	const handleInputChange = (event: React.KeyboardEvent<HTMLElement>) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			if (selectedMessage && editMsgRef.current) {
				handleMsgEdit(selectedMessage.id, editMsgRef.current.value, resetEdit);
			}
		}
	}

	const handleInviteJoin = async (invite: Invite) => {
		await acceptInvite(invite, channelProps, setChannelProps);
		navigate('/channels');
	}

	const handleClose = () => {
		setMousePosition(null);
		setMenuId(null);
	}

	const createBubbleSx = (
		isLocalUser: boolean,
		isNewMsgBlock: boolean,
		isMsgBlockEnd: boolean,
	): SxProps<Theme> => {
		if (isLocalUser) {
			return ({
				borderTopRightRadius: isNewMsgBlock ? undefined : '0.2em',
				borderBottomRightRadius: isMsgBlockEnd ? undefined : '0.2em',
			});
		}
		return ({
			backgroundColor: '#7280ce',
			borderTopLeftRadius: isNewMsgBlock ? undefined : '0.2em',
			borderBottomLeftRadius: isMsgBlockEnd ? undefined : '0.2em',
		});
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
				const inviteLink = getLink(INVITE_DOMAIN, msg.content);

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
							onCopyClick={() => copyMessage(msg)}
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
							paddingTop={isNewMsgBlock ? 1 : 0}
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
							<Stack
								direction={'row'}
								spacing={1}
								alignItems="flex-start"
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
											flexGrow: isEditing ? 1 : undefined,
											...createBubbleSx(isLocalUser, isNewMsgBlock, !inviteLink && isMsgBlockEnd),
										}}
									>
										<Stack spacing={-.5} display={isEditing ? 'none' : 'flex'} >
											{msg.content.startsWith('GameRoom-') ? (
												isLocalUser ? (
												<Typography
													variant="body1"
													sx={{ whiteSpace: 'pre-line', fontStyle: 'italic' }}
												>
													Game invitation has been sent.
												</Typography>
												) : (
												<Typography
													variant="body1"
													sx={{ whiteSpace: 'pre-line', cursor: 'pointer', fontStyle: 'italic' }}
													onClick={() => {
														navigate(`/game`);
														userSocket?.emit("joinGame", msg.content, (roomId: string) => {
															if (!roomId.startsWith('GameRoom-'))
																handleError(roomId);
														})
													}}
												>
													Click here to join the game.
												</Typography>
												)
											) : (
											<Typography
												variant="body1"
												sx={{ whiteSpace: 'pre-line' }}
											>
												{msg.content}
											</Typography>
											)}
											<StatusTypography
												hidden={!msg.edited || isEditing}
												sx={{ alignSelf: isLocalUser ? 'flex-start' : 'flex-end' }}
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
						{inviteLink && (
							<>
								<Divider
									sx={{
										alignSelf: 'flex-start',
										backgroundColor: theme.palette.primary.light,
									}}
								/>
								<Box
									paddingLeft={isLocalUser ? 0 : 5.5}
									sx={{
										display: 'flex',
										flexDirection: isLocalUser ? 'row-reverse' : 'row',
									}}
								>
									<InviteMessage
										link={inviteLink}
										onJoin={handleInviteJoin}
										bubbleSx={ createBubbleSx(isLocalUser, false, isMsgBlockEnd) }
										small
									/>
								</Box>
							</>
						)}
						</Stack>
					</React.Fragment>
				);
			})}
		</>
	);
};

