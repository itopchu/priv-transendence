import { Box, Button, CircularProgress, Divider, InputBase, Menu, MenuItem, PopoverPosition, Stack, styled, SxProps, Theme, Typography, useMediaQuery, useTheme } from "@mui/material";
import { BACKEND_URL, handleError } from "../utils";
import axios from "axios";
import { Message } from "../../../Layout/Chat/InterfaceChat";
import React, { useEffect, useState } from "react";
import { Invite } from "../../../Providers/ChannelContext/Types";
import { ClickTypography, CustomAvatar, LoadingBox } from "./Components";
import { getInvite } from "../../../Providers/ChannelContext/utils";

const MessageMenuItem = styled(MenuItem)(({ theme }) => ({
	fontSize: '.9rem',
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
	ref: React.MutableRefObject<HTMLInputElement | undefined>,
	msg: Message | undefined
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
			MenuListProps={{ autoFocus: false }}
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
	onJoin?: (invite: Invite) => Promise<void>,
	bubbleSx?: SxProps<Theme>,
	small?: boolean,
}

export const InviteMessage: React.FC<InviteMessageType> = ({ link, onJoin, bubbleSx, small }) => {
	const theme = useTheme();
	const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm')) || small;

	const [joining, setJoining] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(true);
	const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);
	const [invite, setInvite] = useState<Invite | undefined>(undefined);

	useEffect(() => {
		async function getInviteInfo() {
			await getInvite(link, setInvite, setErrorMsg);
			setLoading(false);
		}

		setLoading(true);
		getInviteInfo();

		return () => {
			setInvite(undefined);
		};
	}, [link]);

	async function handleJoin() {
		if (invite && onJoin) {
			setJoining(true);
			await onJoin(invite);
			setJoining(false);
		}
	}

	return (
		<ChatBubble 
			sx={{
				width: 'fit-content',
				minWidth: isSmallScreen || loading ? '200px' : '350px',
				...bubbleSx
			}}
		>
			<Stack
				padding={theme.spacing(.5)}
				spacing={theme.spacing(1)}
			>
				<Typography
					noWrap
					variant="body1"
					fontSize={"large"}
					color={'textSecondary'}
					sx={{
						cursor: 'default',
						fontWeight: 'bold',
					}}
				>
					{invite || loading ? 'You have been invite to...' : 'You have been invited, but...'}
				</Typography>
				<Stack
					flexDirection={isSmallScreen ? 'column' : 'row'}
					justifyContent={'space-between'}
					alignItems={'center'}
					gap={theme.spacing(isSmallScreen ? 1 : 2)}
					textOverflow={'ellipsis'}
				>
					{loading ? (
						<LoadingBox>
							<CircularProgress size={50} color="secondary" />
						</LoadingBox>
					) : (
						<>
							<Stack
								flexDirection={isSmallScreen ? 'column' : 'row'}
								alignItems={'center'}
								gap={theme.spacing(1)}
							>
								<CustomAvatar
									alt=":C"
									src={invite?.destination.image}
									sx={{ height: '3em', width: '3em' }}
								>
								</CustomAvatar>
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
											textAlign: isSmallScreen ? 'center' : 'left',
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
											textAlign: isSmallScreen ? 'center' : 'left',
											WebkitLineClamp: 2,
											lineClamp: 2,
										}}
									>
										{invite?.destination.description || errorMsg || 'We have no clue why...'}
									</Typography>
								</Stack>
							</Stack>

							<Button
								onClick={handleJoin}
								disabled={!invite}
								variant='contained'
								color={'success'}
								fullWidth={isSmallScreen}
								sx={{
									width: isSmallScreen ? undefined : '5em',
									height: isSmallScreen ? undefined : '3em',
									whiteSpace: 'nowrap',
								}}
							>
								{joining ? (
									<CircularProgress size={20} />
								) : (
									invite?.isJoined ? 'Joined' : 'Join'
								)}
							</Button>
						</>
					)}
				</Stack>
			</Stack>
		</ChatBubble>
	);
}
