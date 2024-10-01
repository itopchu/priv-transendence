import { Box, Divider, InputBase, Menu, MenuItem, PopoverPosition, styled, Typography } from "@mui/material";
import { BACKEND_URL, handleError } from "../utils";
import axios from "axios";
import { Message } from "../../../Layout/Chat/InterfaceChat";
import React, { useEffect } from "react";

const MessageMenuItem = styled(MenuItem)(({ theme }) => ({
	fontSize: '.9rem',
	[theme.breakpoints.down('sm')]: {
		margin:  -8,
	},
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
}

export const MsgContextMenu: React.FC<MsgContextMenuType> = ({
	open,
	onClose,
	anchorPosition,
	onEditClick,
	onDeleteClick,
}) => (
	<Menu
		open={open}
		onClose={onClose}
		anchorReference="anchorPosition"
		anchorPosition={anchorPosition}
		sx={{
			'& .MuiPaper-root': {
				padding: '0px 8px',
			},
		}}
	>
		<MessageMenuItem onClick={onEditClick}>
			Edit Message
		</MessageMenuItem >
		<Divider />
		<MessageMenuItem
			onClick={onDeleteClick}
			sx={{ color: 'red' }}
		>
			Delete Message
		</MessageMenuItem>
	</Menu>
)
