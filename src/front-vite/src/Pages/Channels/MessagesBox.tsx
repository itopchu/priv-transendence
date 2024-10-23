import React, { useCallback, useEffect, useRef, useState } from "react";
import { Message } from "../../Layout/Chat/InterfaceChat";
import { formatDate, getLink, getTimeDiff, handleCopy, INVITE_DOMAIN, isDiffDate } from "../../Providers/ChannelContext/utils";
import { getUsername, handleError, } from "./utils";
import { Box, darken, Divider, Grid, IconButton, Stack, SxProps, Theme, Typography, useTheme } from "@mui/material";
import { ButtonAvatar, ClickTypography } from "./Components/Components";
import { UserPublic, useUser } from "../../Providers/UserContext/User";
import { useNavigate } from "react-router-dom";
import {
	ChatBubble,
	ChatBubbleInputBase,
	StatusTypography,
	HiddenTimestamp,
	handleMsgEdit,
	useEditCancel,
	useEditMsg,
	InviteMessage
} from "./Components/ChatBoxComponents";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { EditRounded as EditIcon } from "@mui/icons-material"

interface MessagesBoxProps {
	messages: Message[];
	searchedMsgId?: number;
	messageStyle: 'channel' | 'dm';
	virtuosoStyle?: React.CSSProperties;
}

interface MessageBubbeProps {
	msg: Message;
	nextMsg: Message | undefined;
	prevMsg: Message | undefined;
	variant: 'channel' | 'dm';
	isSearched: boolean;
	onAuthorClick?: (user: UserPublic) => void;
	onInputChange?: (event: React.KeyboardEvent<HTMLElement>) => void;
	onInviteJoin?: () => void;
}

const editedNote = (isLocalUser: boolean, isHidden: boolean, dmStyle: boolean) => (
	<StatusTypography
		hidden={isHidden}
		sx={dmStyle ? { alignSelf: isLocalUser ? 'flex-start' : 'flex-end' } : undefined}
	>
		(edited)
	</StatusTypography>
)

const GameInviteMsg: React.FC<{ isLocalUser: boolean, gameRoom: string }> = (
	{ isLocalUser, gameRoom }
) => {
	const navigate = useNavigate();
	const { userSocket } = useUser();

	const handleJoinGame =  (roomId: string) => {
		if (!roomId.startsWith('GameRoom-'))
			handleError(roomId);
	}

	const handleInviteAccept = () => {
		navigate('/game');
		userSocket?.emit("joinGame", gameRoom, handleJoinGame);
	}

	return (
		<Typography
			variant="body1"
			sx={{
				whiteSpace: 'pre-line',
				cursor: isLocalUser ? undefined : 'pointer',
				fontStyle: 'italic'
			}}
			onClick={isLocalUser ? undefined : handleInviteAccept}
		>
			{isLocalUser
				? 'Game invitation has been sent.'
				: 'Click here to join the game.'}
		</Typography>
	);
}

const createBubbleSx = (
	isDmStyle: boolean,
	isLocalUser: boolean,
	isMsgBlockStart: boolean,
	isMsgBlockEnd: boolean,
): SxProps<Theme> => {
	if (isLocalUser && isDmStyle) {
		return ({
			borderTopRightRadius: isMsgBlockStart ? undefined : '0.2em',
			borderBottomRightRadius: isMsgBlockEnd ? undefined : '0.2em',
		});
	}
	return ({
		backgroundColor: isLocalUser ? undefined : '#7280ce',
		borderTopLeftRadius: isMsgBlockStart ? undefined : '0.2em',
		borderBottomLeftRadius: isMsgBlockEnd ? undefined : '0.2em',
	});
}

const oneHour = 60 * 60 * 1000;
const timeSeparation = 2 * 60 * 1000; // 2 min in milisecondes
const MessageBubble = React.memo<MessageBubbeProps>(
	({ prevMsg, nextMsg, msg, isSearched, variant, onAuthorClick, onInputChange, onInviteJoin }
) => {
	const theme = useTheme();
	const { user: localUser } = useUser();
	const isDmStyle = variant === 'dm';

	const isDiffTime = !nextMsg || getTimeDiff(nextMsg.timestamp, msg.timestamp) > timeSeparation;
	const isPrevDiffTime = !prevMsg || getTimeDiff(msg.timestamp, prevMsg.timestamp) > timeSeparation;
	const isDiffTimeBlock = !prevMsg || (isDmStyle
	? getTimeDiff(msg.timestamp, prevMsg.timestamp) > oneHour
	: isDiffDate(msg.timestamp, prevMsg.timestamp));

	const isLastUserMessage = nextMsg?.author.id !== msg.author.id;
	const isDifferentUser = prevMsg?.author.id !== msg.author.id;
	const isLocalUser = msg.author.id === localUser.id;

	const isMsgBlockStart = isDifferentUser || isPrevDiffTime;
	const isMsgBlockEnd = isLastUserMessage || isDiffTime;
	const isEditing = false;

	const inviteLink = getLink(INVITE_DOMAIN, msg.content);
	const gameRoom = getLink('GameRoom-', msg.content);
	const username = getUsername(msg.author);
	const timestamp = formatDate(msg.timestamp);
	const fullTime = `${timestamp.date} ${timestamp.particle} ${timestamp.time}`;

	return (
		<React.Fragment>
			{isDiffTimeBlock && (
				<Box
					flexGrow={1}
					paddingBottom={theme.spacing(3)}
					paddingTop={theme.spacing(3)}
				>
					<Divider sx={{ color: 'text.secondary', cursor: 'default', }} >
						{isDmStyle ? fullTime : timestamp.date}
					</Divider>
				</Box>
			)}
			<div style={{ paddingTop: isMsgBlockStart ? theme.spacing(isDmStyle ? 1 : 3) : '0px' }}>
				<Stack
					paddingTop={'1px'}
					paddingLeft={isDmStyle
						? theme.spacing(isLocalUser ? 0 : 1)
						: theme.spacing(2.8)}
					paddingRight={isDmStyle ? 0 : theme.spacing(2)}
					sx={{
						backgroundColor: isEditing || isSearched
							? isDmStyle
								? 'rgba(255, 255, 255, .05)'
								: 'rgba(0, 0, 0, .05)'
							: 'transparent',
						'&:hover': {
							backgroundColor: isDmStyle
								? 'rgba(255, 255, 255, .05)'
								: 'rgba(0, 0, 0, .05)',
						},
						'&:hover .hidden-timestamp': {
							visibility: 'visible',
						},
					}}
				>
					<Stack
						direction={'row'}
						spacing={1}
						minWidth={isDmStyle ? 0 : '17em'}
					>
						{(isDmStyle ? isMsgBlockEnd && !isLocalUser : isMsgBlockStart) ? (
							<ButtonAvatar
								clickEvent={() => onAuthorClick?.(msg.author)}
								avatarSx={ isDmStyle
									? { width: 36, height: 36, border: '0px' }
									: { width: 50, height: 50, border: '0px' } }
								sx={{ boxShadow: theme.shadows[5] }}
								src={msg.author?.image}
							/>
						) : !isDmStyle && (
							<Box
								sx={{
									display: 'flex',
									alignItems: 'flex-end',
									justifyContent: 'center',
									flexGrow: 1,
									maxWidth: 50,
									minWidth: 50,
								}}
							>
								<HiddenTimestamp timestamp={timestamp.time} />
							</Box>
						)}

						<Stack spacing={0.4} flexGrow={1}>
							{!isDmStyle && isMsgBlockStart && (
								<Stack flexDirection="row">
									<ClickTypography
										noWrap
										paddingLeft={2}
										variant="h3"
										onClick={() => onAuthorClick?.(msg.author)}
										sx={{ fontWeight: 'bold', fontSize: 'medium' }}
									>
										{username}
									</ClickTypography>
									<Typography
										noWrap
										variant="caption"
										color={'textSecondary'}
										whiteSpace={'nowrap'}
										sx={{
											fontSize: '0.7em',
											paddingLeft: '1em',
											cursor: 'default',
										}}
									>
										{fullTime}
									</Typography>
								</Stack>
							)}

							<Stack
								paddingLeft={!isDmStyle || isLocalUser || isMsgBlockEnd ? 0 : 5.5}
								justifyContent={isDmStyle ? 'space-between' : undefined}
								flexDirection={isDmStyle && isLocalUser ? 'row-reverse' : 'row'}
								gap={theme.spacing(.5)}
							>
								<ChatBubble
									sx={{
										flexGrow: isEditing ? 1 : 0,
										...createBubbleSx(isDmStyle, isLocalUser, isMsgBlockStart, !inviteLink && isMsgBlockEnd)
									}}
								>
									<Stack spacing={-.5} display={isEditing ? 'none' : 'flex'} >
										{gameRoom ? (
											<GameInviteMsg isLocalUser={isLocalUser} gameRoom={gameRoom} />
										) : (
											<Typography
												display={isEditing ? 'none' : 'block'}
												variant="body1"
												sx={{ whiteSpace: 'pre-line' }}
											>
												{msg.content}
											</Typography>
										)}
										{isDmStyle && editedNote(isLocalUser, !msg.edited || isEditing, isDmStyle)}
									</Stack>

									{isEditing && (
										<ChatBubbleInputBase
											multiline
											onKeyDown={onInputChange}
										/>
									)}
								</ChatBubble>
								{!isDmStyle && editedNote(isLocalUser, !msg.edited || isEditing, isDmStyle)}
								{isDmStyle  && (
									<HiddenTimestamp
										timestamp={timestamp.time}
										sx={{
											alignSelf: 'flex-end',
											paddingInline: '5px',
											minWidth: '50px',
										}}
									/>
								)}
							</Stack>
						</Stack>
					</Stack>
					{inviteLink && (
						<div style={{ paddingTop: '1px' }}>
							<Box
								paddingLeft={isDmStyle ? isLocalUser ? 0 : 5.5 : 7.25}
								sx={{
									display: 'flex',
									flexDirection: isDmStyle && isLocalUser ? 'row-reverse' : 'row'
								}}
							>
								<InviteMessage
									small={isDmStyle}
									link={inviteLink}
									onJoin={onInviteJoin}
									msgAuthor={msg.author}
									bubbleSx={
										createBubbleSx(isDmStyle, isLocalUser, false, isMsgBlockEnd)
									}
								/>
							</Box>
						</div>
					)}
				</Stack>
			</div>
		</React.Fragment>
	);
},
	(prevProps, nextProps) => {
		return (
			prevProps.msg.content === nextProps.msg.content &&
			prevProps.prevMsg?.id === nextProps.prevMsg?.id &&
			prevProps.nextMsg?.id === nextProps.nextMsg?.id &&
			prevProps.isSearched === nextProps.isSearched
		);
	}
)

const MessagesBox: React.FC<MessagesBoxProps> = ((
	{ messageStyle, messages, searchedMsgId, virtuosoStyle }
) => {
	const virtuosoRef = useRef<VirtuosoHandle>(null);
	const theme = useTheme(); const navigate = useNavigate();

	const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
		if (!searchedMsgId) return;

		const scrollToItemKey = () => {
			const index = messages.findIndex(msg => msg.id === searchedMsgId);
			if (index !== -1) {
				virtuosoRef.current?.scrollToIndex({
					index,
					behavior: 'smooth',
				});
			}
		}

		scrollToItemKey();
	}, [searchedMsgId]);
//	const deleteMessage = () => {
//		if (!selectedMessage) return;
//	
//		//handleDeleteMessage(selectedMessage.id, () => handleClose(true))
//	}
//	
//	const copyMessage = async () => {
//		if (!selectedMessage) return;
//	
//		const copied = await handleCopy(selectedMessage.content);
//	}

	//const handleInputChange = (event: React.KeyboardEvent<HTMLElement>) =>  {
	//	if (event.key === 'Enter' && !event.shiftKey) {
	//		event.preventDefault();
	//		if (selectedMessage && editMsgRef.current) {
	//			handleMsgEdit(selectedMessage.id, editMsgRef.current.value, resetEdit);
	//		}
	//	}
	//}

	const handleInviteJoin = () => {
		navigate('/channels');
	}

	const memoizedItemContent = useCallback((index: number, msg: Message) => (
		<MessageBubble
			variant={messageStyle}
			onAuthorClick={() => navigate(`/profile/${msg.author.id}`)}
			onInviteJoin={handleInviteJoin}
			nextMsg={messages[index + 1]}
			prevMsg={messages[index - 1]}
			isSearched={msg.id === searchedMsgId}
			msg={msg}
		/>
	), [messages, searchedMsgId]);

	return (
		<Virtuoso
			ref={virtuosoRef}
			style={{ overflowX: 'hidden', scrollbarWidth: 'thin', ...virtuosoStyle }}
			atBottomStateChange={setIsAtBottom}
			initialTopMostItemIndex={Math.max(0, messages.length - 1)}
			followOutput={isAtBottom}
			increaseViewportBy={200}
			data={messages}
			itemContent={memoizedItemContent}
			computeItemKey={(_, message) => message.id}
			components={{
				Footer: () => (
					<div style={{ paddingBottom: theme.spacing(2) }} />
				),
			}}
		/>
	);
})

export default MessagesBox
