import React, { useEffect, useRef, useState } from "react";
import { Message } from "../../Layout/Chat/InterfaceChat";
import { formatDate, getTimeDiff, isDiffDate } from "../../Providers/ChannelContext/utils";
import { BACKEND_URL, getUsername, handleError } from "./utils";
import { Box, Divider, InputBase, Menu, MenuItem, Stack, styled, Typography, useTheme } from "@mui/material";
import { ButtonAvatar, ChatBubble, ClickTypography } from "./Components/Components";
import { useUser } from "../../Providers/UserContext/User";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface ChannelMessagesType {
	messages: Message[];
}

const MessageMenuItem = styled(MenuItem)(({ theme }) => ({
	fontSize: '.9rem',
	[theme.breakpoints.down('sm')]: {
		margin:  -8,
	},
}))

async function handleDeleteMessage(msgId: number | undefined, handleClose: () => void) {
	if (!msgId) return;

	try {
		await axios.delete(`${BACKEND_URL}/message/${msgId}`, { withCredentials: true });
	} catch (error) {
		handleError('Could not delete message:', error);
	}
	handleClose();
}

async function handleMsgEdit(msgId: number, newContent: string,  reset: () => void) {
	const	payload = {
		content: newContent,
	}

	try {
		await axios.patch(
			`${BACKEND_URL}/message/${msgId}`,
			{ payload },
			{ withCredentials: true }
		);
		reset();
	} catch (error) {
		handleError('Could not edit message:', error);
	}
}

const timeSeparation = 2 * 60 * 1000; // 2 min in milisecondes
export const ChannelMessages: React.FC<ChannelMessagesType> = ({ messages }) =>{
	const theme = useTheme();
	const navigate = useNavigate();

	const editMsgRef = useRef<HTMLInputElement>();

	const  { user: localUser } = useUser();

	const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null >(null);
	const [selectedMessage, setSelectedMessage] = useState<Message | undefined>(undefined);
	const [menuId, setMenuId] = useState<number | null>(null);
	const [editMode, setEditMode] = useState<boolean>(false);

	const resetEdit = () => {
		setEditMode(false);
		setSelectedMessage(undefined);
	}

	useEffect(() => {
		if (!editMsgRef.current || !selectedMessage) return;

		editMsgRef.current.value = selectedMessage.content;
	}, [selectedMessage]);

	useEffect(() => {
		if (!editMode) return;

		const handleKeyDown = (event: KeyboardEvent) =>  {
			if (event.key === 'Escape') {
				resetEdit();
			}
		}

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		}
	}, [editMode]);

	const enableEditMode = (msg: Message) => {
		setSelectedMessage(msg);
		setEditMode(true);
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

	const handleInputChange = (event: React.KeyboardEvent<HTMLElement>) =>  {

		if (event.key === 'Escape') {
			setEditMode(false);
			setSelectedMessage(undefined);
		} else if (event.key === 'Enter' && !event.shiftKey) {
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

	const contextMenu = (msg: Message) => {
		return (
			<Menu
				open={Boolean(mousePosition) && menuId === msg.id}
				onClose={handleClose}
				anchorReference="anchorPosition"
				anchorPosition={mousePosition ? { left: mousePosition.x, top: mousePosition.y } : undefined}
				sx={{
					'& .MuiPaper-root': {
						padding: '0px 8px',
					},
				}}
			>
				<MessageMenuItem onClick={() => enableEditMode(msg)}>
					Edit Message
				</MessageMenuItem >
				<Divider />
				<MessageMenuItem
					onClick={() => {
						handleDeleteMessage(msg.id, handleClose)
						setSelectedMessage(undefined);
					}}
					sx={{ color: 'red' }}
				>
					Delete Message
				</MessageMenuItem>
			</Menu>
		);
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
				const isDiffDay = isFirstMessage || isDiffDate(msg.timestamp, messages[index - 1].timestamp);

				const isDifferentUser = isFirstMessage || messages[index - 1].author.id !== msg.author.id;
				const isLastUserMessage = isLastMessage || messages[index + 1].author.id !== msg.author.id;

				const isNewMsgBlock = isDifferentUser || isPrevDiffTime;
				const isEditing = editMode && selectedMessage?.id === msg.id;

				const username = getUsername(msg.author);
				const timestamp = formatDate(msg.timestamp);

				return (
					<React.Fragment key={msg.id}>
						{contextMenu(msg)}
						{isDiffDay && (
							<Box flexGrow={1} paddingTop={3} >
								<Divider sx={{ color: 'text.secondary', cursor: 'default', }} >
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
							onContextMenu={(event) => openContextMenu(event, msg)}
							sx={{
								backgroundColor: isEditing ? 'rgba(0, 0, 0, .05)' : undefined,
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
												paddingLeft: '1em',
												cursor: 'default',
											}}
										>
											{`${timestamp.date} ${timestamp.particle} ${timestamp.time}`}
										</Typography>
									</Stack>
								)}

								<Stack
									flexDirection={'row'}
									gap={theme.spacing(.5)}
								>
									<ChatBubble
										sx={{
											backgroundColor: localUser.id === msg.author.id ? undefined : '#7280ce',
											borderTopLeftRadius: isNewMsgBlock ? undefined : '0.2em',
											borderBottomLeftRadius: isLastUserMessage || isDiffTime ? undefined : '0.2em',
											flexGrow: isEditing ? 1 : 0,
										}}
									>
										<Typography
											display={isEditing ? 'none' : 'block'}
											variant="body1"
											sx={{ whiteSpace: 'pre-line' }}
										>
											{msg.content}
										</Typography>

										{isEditing && (
											<InputBase
												multiline
												inputRef={editMsgRef}
												onKeyDown={handleInputChange}
												sx={{
													width: '100%',
													display: 'block',
													flexGrow: 1,
													whiteSpace: 'pre-line',
													overflow: 'hidden',
													'& textarea': {
														resize: 'none',
														overflow: 'hidden',
													},
												}}
											/>
										)}
									</ChatBubble>
									<Typography
										display={msg.edited && !isEditing ? 'block' : 'none'}
										color={'textSecondary'}
										variant="caption"
										alignSelf={'flex-end'}
										fontSize={'10px'}
										sx={{ cursor: 'default', userSelect: 'none' }}
									>
										(edited)
									</Typography>
								</Stack>
							</Stack>
						</Stack>
					</React.Fragment>
				);
			})}
		</>
	);
}
