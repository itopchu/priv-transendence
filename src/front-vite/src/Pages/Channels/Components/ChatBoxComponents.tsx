import { Box, Button, CircularProgress, InputBase, Menu, MenuItem, PopoverPosition, Stack, styled, SxProps, Theme, Typography, useMediaQuery, useTheme } from "@mui/material";
import { formatErrorMessage, handleError } from "../utils";
import axios from "axios";
import { Message } from "../../../Layout/Chat/InterfaceChat";
import React, { useEffect, useState } from "react";
import { ChannelStates, Invite } from "../../../Providers/ChannelContext/Types";
import { ClickTypography, CustomAvatar, LoadingBox } from "./Components";
import { acceptInvite, getInvite } from "../../../Providers/ChannelContext/utils";
import { UserPublic, useUser } from "../../../Providers/UserContext/User";
import { useChannel } from "../../../Providers/ChannelContext/Channel";
import { BACKEND_URL } from "../../../Providers/UserContext/User";

const MessageMenuItem = styled(MenuItem)(({ theme }) => ({
	fontSize: '.9rem',
	padding: theme.spacing(1),
	paddingInline: theme.spacing(2),
}))

export const ChatBubble = styled(Box)(({ theme }) => ({
  display: 'flex',
  backgroundColor: theme.palette.primary.main,
  borderRadius: '1.5em',
  alignSelf: 'flex-start',
  padding: '6px 1em',
  wordBreak: 'break-word',
  overflowY: 'auto',
  overflowX: 'hidden',
}));

export const ChatBubbleInputBase = styled(InputBase)(() => ({
	display: 'flex',
	flexGrow: 1,
	whiteSpace: 'pre-line',
	overflow: 'hidden',
	'& textarea': {
		resize: 'none',
		overflow: 'hidden',
	},
}))

type StatusTypographyType = {
	hidden?: boolean,
	sx?: Object,
	children?: React.ReactNode;
}
export const StatusTypography: React.FC<StatusTypographyType> = ({ hidden, sx, children })  => (
	<Typography
		variant="caption"
		sx={{
			display: hidden ? 'none' : 'block',
			alignSelf: 'flex-end',
			color: (theme) => theme.palette.text.secondary,
			cursor: 'default',
			fontSize: '0.55em',
			textAlign: 'center',
			userSelect: 'none',
			...sx
		}}
	>
		{children}
	</Typography>
)

type HiddenTimestampType = {
	timestamp: string,
	sx?: Object,
}
export const HiddenTimestamp: React.FC<HiddenTimestampType> = ({ timestamp, sx }) => (
	<Typography
		noWrap
		className="hidden-timestamp"
		variant="caption"
		sx={{
			color: (theme) => theme.palette.text.secondary,
			cursor: 'default',
			fontSize: '0.55em',
			visibility: 'hidden',
			...sx,
		}}
	>
		{timestamp}
	</Typography>
)

export async function handleDeleteMessage(msgId: number | undefined, handleClose: () => void) {
	if (!msgId) return;

	try {
		await axios.delete(`${BACKEND_URL}/message/${msgId}`, { withCredentials: true });
	} catch (error) {
		handleError('Could not delete message:', error);
	}
	handleClose();
}

export async function handleMsgEdit(msgId: number, newContent: string,  reset: () => void) {
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

export function useEditMsg(
	ref: React.MutableRefObject<HTMLInputElement | undefined | null>,
	msg: Message | undefined | null
) {
	useEffect(() => {
		if (!ref.current || !msg) return;

		ref.current.value = msg.content;
		ref.current.focus();
	}, [msg]);
}

export function useEditCancel(
	editMode: boolean,
	resetFunction: () => void,
) {
	useEffect(() => {
		if (!editMode) return;

		const handleKeyDown = (event: KeyboardEvent) =>  {
			if (event.key === 'Escape') {
				resetFunction();
			}
		}

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		}
	}, [editMode]);
}

interface MsgContextMenuType {
	open: boolean;
	anchorPosition: PopoverPosition | undefined;
	onClose: () => void;
	onEditClick: () => void;
	onDeleteClick: () => void;
	onCopyClick: () => void;
}

export const MsgContextMenu: React.FC<MsgContextMenuType> = ({
	open,
	onClose,
	anchorPosition,
	onEditClick,
	onDeleteClick,
	onCopyClick,
}) => {
	const selection = window.getSelection()?.toString;

	const handleCopySelection = async () => {
		const selectedText = selection?.toString();
		if (selectedText) {
			await navigator.clipboard.writeText(selectedText);
			onClose();
		}
	}

	return (
		<Menu
			open={open}
			onClose={onClose}
			anchorReference="anchorPosition"
			anchorPosition={anchorPosition}
			MenuListProps={{
				autoFocus: false,
				sx: {
					p: 0,
				}
			}}
		>
			{selection && selection.length > 0 && (
				<MessageMenuItem divider onClick={handleCopySelection} >
					Copy Highlighted
				</MessageMenuItem>
			)}
			<MessageMenuItem divider onClick={onCopyClick}>
				Copy Message
			</MessageMenuItem >
			<MessageMenuItem divider onClick={onEditClick}>
				Edit Message
			</MessageMenuItem >
			<MessageMenuItem
				onClick={onDeleteClick}
				sx={{ color: 'red' }}
			>
				Delete Message
			</MessageMenuItem>
		</Menu>
	);
}

type InviteMessageType = {
	link: string,
	onJoin?: () => void,
	bubbleSx?: SxProps<Theme>,
	avatarSx?: SxProps<Theme>,
	variant?: 'default' | 'underButton',
	showInvitation?: boolean,
	neverSmall?: boolean,
	small?: boolean,
	msgAuthor?: UserPublic,
}

export const InviteMessage: React.FC<InviteMessageType> = ({
	link,
	small,
	onJoin,
	bubbleSx,
	avatarSx,
	neverSmall,
	msgAuthor,
	variant = 'default',
	showInvitation = true,
}) => {
	const theme = useTheme();
	const { user } = useUser();
	const { channelProps, changeProps } = useChannel();
	const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm')) || small;
	const screenIsSmall = !neverSmall && (isSmallScreen || small);

	const [joining, setJoining] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(true);
	const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);
	const [invite, setInvite] = useState<Invite | undefined>(undefined);

	async function getInviteInfo(controller?: AbortController) {
		try {
			await getInvite(link, setInvite, controller);
		} catch (error) {
			if (!axios.isCancel(error)) {
				setErrorMsg(formatErrorMessage(error));
			}
		}
	}

	useEffect(() => {
		const controller = new AbortController();
		getInviteInfo(controller);

		return () => {
			controller.abort();
			setLoading(true);
			setInvite(undefined);
		};
	}, [link]);

	useEffect(() => {
		if (!invite && !errorMsg) return;

		setLoading(false);
	}, [invite, errorMsg]);

	async function handleJoin() {
		if (invite) {
			setJoining(true);
			try {
				const membership = await acceptInvite(invite, channelProps);
				if (membership) {
					changeProps({
						selected: membership,
						state: ChannelStates.chat,
					});
					onJoin?.();
				}
				await getInviteInfo();
			} catch (error: any) {
				if (error?.response?.status === 400) {
					setErrorMsg(formatErrorMessage(error, '', ', try refreshing the page!'));
				} else {
					setErrorMsg(formatErrorMessage(error));
				}
				setInvite(undefined);
			} finally {
				setJoining(false);
			}
		}
	}

	const JoinButton = () => {
		if (!invite && !joining) return;

		const fullWidth = screenIsSmall || variant === 'underButton';

		return (
			<Button
				onClick={handleJoin}
				variant='contained'
				color={'success'}
				fullWidth={fullWidth}
				sx={{
					width: fullWidth ? undefined : '5em',
					height: fullWidth ? undefined : '3em',
					whiteSpace: 'nowrap',
				}}
			>
				{joining ? (
					<CircularProgress size={'12.4%'} />
				) : (
					invite?.isJoined ? 'Joined' : 'Join'
				)}
			</Button>
		);
	};

	return (
		<ChatBubble 
			sx={{
				alignItems: 'center',
				justifyContent: 'center',
				width: 'fit-content',
				minWidth: '275px',
				height: '100%',
				overflow: 'hidden',
				...bubbleSx
			}}
		>
			<Stack
				padding={!showInvitation || screenIsSmall ? theme.spacing(1) : theme.spacing(.5)}
				spacing={theme.spacing(variant === 'default' ? 1 : 1.5)}
			>
				<Typography
					noWrap
					variant="body1"
					fontSize={"large"}
					color={'textSecondary'}
					sx={{
						display: showInvitation ? 'block' : 'none',
						cursor: 'default',
						fontWeight: 'bold',
					}}
				>
					{`You have ${user.id === msgAuthor?.id ? 'sent an invite' : 'been invited'}${invite || loading ? '  to...' : ', but...'}`}
				</Typography>
				<Stack
					flexDirection={screenIsSmall ? 'column' : 'row'}
					justifyContent={'space-between'}
					alignItems={'center'}
					gap={theme.spacing(screenIsSmall ? 1 : 2)}
					textOverflow={'ellipsis'}
				>
					{loading ? (
						<LoadingBox>
							<CircularProgress size={50} color="secondary" />
						</LoadingBox>
					) : (
						<>
							<Stack
								flexDirection={screenIsSmall ? 'column' : 'row'}
								alignItems={'center'}
								gap={theme.spacing(1)}
							>
								<CustomAvatar
									variant="channel"
									alt={invite?.destination.name}
									src={invite?.destination.image}
									sx={{
										height: isSmallScreen ? '5em' : '3.5em',
										width:	isSmallScreen ? '5em' : '3.5em', 
										...avatarSx
									}}
								/>
								<Stack
									flexGrow={1} 
									spacing={theme.spacing(-.5)}
								>
									<ClickTypography
										onClick={handleJoin}
										disabled={!invite}
										noWrap
										sx={{
											color: invite ? undefined : theme.palette.error.main,
											overflow: 'hidden',
											fontWeight: 'bold',
											fontSize: 'large',
											textOverflow: 'ellipsis',
											textAlign: screenIsSmall ? 'center' : 'left',
										}}
									>
										{invite?.destination.name || 'Invalid Invite'}
									</ClickTypography>
									<Typography
										color={'textSecondary'}
										sx={{
											cursor: 'default',
											display: '-webkit-box',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											WebkitBoxOrient: 'vertical',
											textAlign: screenIsSmall ? 'center' : 'left',
											WebkitLineClamp: 2,
											lineClamp: 2,
										}}
									>
										{invite?.destination.description || errorMsg || 'We have no clue why...'}
									</Typography>
								</Stack>
							</Stack>

							{variant === 'default' && <JoinButton />}
						</>
					)}
				</Stack>
				{variant === 'underButton' && <JoinButton />}
			</Stack>
		</ChatBubble>
	);
}
