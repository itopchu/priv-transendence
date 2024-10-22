import {
	Box,
	IconButton,
	lighten,
	Popper,
	Stack,
	Typography,
	useMediaQuery,
	useTheme
} from "@mui/material";
import {
	Menu as ShowChannelLineIcon,
	MenuOpen as HideChannelLineIcon,
	Cancel as CloseIcon,
} from "@mui/icons-material"
import { ButtonAvatar, ClickTypography, CustomAvatar, HeaderIconButton, scrollStyleSx, SearchBar } from "../Components/Components";
import { useChannel } from "../../../Providers/ChannelContext/Channel";
import { ChannelStates } from "../../../Providers/ChannelContext/Types";
import React, { SetStateAction, useEffect, useRef, useState } from "react";
import { Message } from "../../../Layout/Chat/InterfaceChat";
import { ChatBubble } from "../Components/ChatBoxComponents";
import { getUsername } from "../utils";
import { formatDate } from "../../../Providers/ChannelContext/utils";
import { useUser } from "../../../Providers/UserContext/User";
import { useChannelLine } from "../../../Providers/ChannelContext/ChannelLine";

type ChatBoxHeaderType = {
	setSelectedMsgId: React.Dispatch<SetStateAction<number | undefined>>,
	messageLog: Map<number, Message>,
}

export const ChatBoxHeader: React.FC<ChatBoxHeaderType> = ({ setSelectedMsgId, messageLog }) => {
	const theme = useTheme();
	const { channelProps, changeProps, } = useChannel();
	const { channelLineProps, changeLineProps } = useChannelLine();
	const { user: localUser, userSocket } = useUser();

	const isTinyScreen = useMediaQuery(theme.breakpoints.down('sm'));
	const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
	const searchRef = useRef<HTMLInputElement>(null);

	const [onlineMembers, setOnlineMembers] = useState<number | undefined>(undefined);
	const [searchResults, setSearchResults] = useState<Message[]>([]);
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

	const channel = channelProps.selected?.channel;
	if (!channel) return (null);

	useEffect(() => {
		if (!channelProps.selected || !userSocket) return;

		const onOnlineMembersUpdate = (data: {id: number, count: number}) => {
			if (data.id === channel.id) {
				setOnlineMembers(data?.count);
			}
		}

		userSocket?.emit('onlineMembers', channel.id, onOnlineMembersUpdate);
		userSocket?.on('onlineMembers', onOnlineMembersUpdate);
		return () => {
			if (userSocket) {
				userSocket.off('onlineMembers', onOnlineMembersUpdate);
			}
		};
	}, [channelProps.selected?.id, userSocket]);

	const closePopper = () => {
		setSelectedMsgId(undefined);
		setAnchorEl(null);
	}

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (searchRef.current?.value) {
			const regex = new RegExp(searchRef.current.value, "i");
			const results = Array.from(messageLog.values())
				.filter((value) => value.content.match(regex))
			setSearchResults(results);
			setAnchorEl(event.currentTarget);
		} else {
			setSearchResults([]);
			closePopper();
		}
	}

	const ResultPopper = () => {
		if (!searchResults.length) return (null);

		return (
			<Popper
				anchorEl={anchorEl}
				open={Boolean(anchorEl)}
				placement="bottom"
				disablePortal={true}
				sx={{
					zIndex: 2,
				}}
			>
				<Stack
					spacing={theme.spacing(1)}
					padding={theme.spacing(1)}
					sx={{
						backgroundColor: lighten(theme.palette.background.default, 0.07),
						borderRadius: '8px',
						boxShadow: theme.shadows[5],
						width: '50ch',
						height: 'fit-content',
						minHeight: '200px',
						maxHeight: '30vh',
					}}
				>
					<IconButton
						size="small"
						onClick={closePopper}
						sx={{
							alignSelf: 'flex-end',
							color: theme.palette.secondary.main,
							'&:hover': {
								color: theme.palette.error.main,
							},
						}}
					>
						<CloseIcon />
					</IconButton>
					<Stack overflow={'auto'} spacing={theme.spacing(1)} sx={scrollStyleSx}>
						{searchResults.map((message) => {
							const user = message.author;
							const timestamp = formatDate(message.timestamp);

							return (
								<Box
									key={message.id}
									onClick={() => setSelectedMsgId(message.id)}
								>
									<Stack
										direction={'row'}
										spacing={1}
										minWidth={'17em'}
										alignItems="flex-start"
										sx={{
											cursor: 'pointer',
											backgroundColor: 'rgba(255, 255, 255, .03)',
											padding: theme.spacing(1),
											borderRadius: '8px',
											'&:hover': {
												backgroundColor: 'rgba(255, 255, 255, .1)',
											},
										}}
									>
										<CustomAvatar
											src={user.image}
											sx={{
												boxShadow: theme.shadows[5],
												width: 50,
												height: 50,
											}}
										/>
										<Stack>
											<Stack spacing={0.4} flexGrow={1}>
													<Stack flexDirection="row">
														<Typography
															paddingLeft={2}
															variant="h3"
															sx={{ fontWeight: 'bold', fontSize: 'medium' }}
														>
															{getUsername(user)}
														</Typography>
														<Typography
															variant="caption"
															color={'textSecondary'}
															whiteSpace={'nowrap'}
															sx={{
																fontSize: '0.7em',
																paddingLeft: '1em',
															}}
														>
															{`${timestamp.date} ${timestamp.particle} ${timestamp.time}`}
														</Typography>
													</Stack>
												</Stack>

												<Stack
													flexDirection={'row'}
													gap={theme.spacing(.5)}
												>
													<ChatBubble
														sx={{
															backgroundColor: localUser.id === user.id ? undefined : '#7280ce',
														}}
													>
														<Typography
															variant="body1"
															sx={{ whiteSpace: 'pre-line' }}
														>
															{message.content}
														</Typography>
													</ChatBubble>
												</Stack>
											</Stack>
										</Stack>
									</Box>
								);
							})}
						</Stack>
					</Stack>
			</Popper>
		);
	}

	return (
		<Stack
			direction='row'
			padding={theme.spacing(2)}
			spacing={theme.spacing(1)}
			sx={{
				height: '64px',
				bgcolor: theme.palette.primary.main,
				alignItems: 'center',
				justifyContent: 'space-between',
			}}
		>
			<HeaderIconButton
				onClick={() => changeLineProps({ hidden: !channelLineProps.hidden })}
				Icon={!channelLineProps.hidden ? HideChannelLineIcon : ShowChannelLineIcon}
			/>

			<Stack direction={'row'} alignItems={'center'} gap={0.7} >
				<ButtonAvatar
					variant="channel"
					src={channel.image}
					avatarSx={ isTinyScreen
						? { height: '45px', width: '45px' }
						: { height: '55px', width: '55px'} }
					clickEvent={() => changeProps({ state: ChannelStates.details })}
				>
				</ButtonAvatar>
				<Stack display={isTinyScreen || (isSmallScreen && !channelLineProps.hidden)
						? 'none' : 'flex'}
					spacing={-1}
				>
					<ClickTypography
						sx={{
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
						}}
						onClick={() => changeProps({ state: ChannelStates.details })}
					>
						{channel.name}
					</ClickTypography>
					<Typography
						variant="caption"
						color={'textSecondary'}
						sx={{ fontSize: 'small', cursor: 'default', }}
					> 
						{`${onlineMembers || '1'} ${(onlineMembers || 1) > 1 ? 'members' : 'member'} online`}
					</Typography>
				</Stack>
			</Stack>

			<SearchBar
				onFocus={handleChange}
				inputChange={handleChange}
				ref={searchRef}
			/>
			<ResultPopper />
		</Stack>
	);
}
