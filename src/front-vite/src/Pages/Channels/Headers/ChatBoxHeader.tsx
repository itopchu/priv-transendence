import {
    Popover,
	Stack,
	Typography,
	useMediaQuery,
	useTheme
} from "@mui/material";
import {
	Menu as ShowChannelLineIcon,
	MenuOpen as HideChannelLineIcon,
	People as DefaultChannelIcon,
} from "@mui/icons-material"
import { ButtonAvatar, ClickTypography, CustomAvatar, HeaderIconButton, SearchBar } from "../Components/Components";
import { useChannel } from "../../../Providers/ChannelContext/Channel";
import { ChannelStates } from "../../../Providers/ChannelContext/Types";
import React, { ReactNode, SetStateAction, useRef, useState } from "react";
import { Message } from "../../../Layout/Chat/InterfaceChat";
import { ChatBubble } from "../Components/ChatBoxComponents";
import { getUsername } from "../utils";
import { formatDate } from "../../../Providers/ChannelContext/utils";
import { useUser } from "../../../Providers/UserContext/User";

type ChatBoxHeaderType = {
	setSelectedMsgId: React.Dispatch<SetStateAction<number | undefined>>,
	messageLog: Map<number, Message>,
}

export const ChatBoxHeader: React.FC<ChatBoxHeaderType> = ({ setSelectedMsgId, messageLog }) => {
	const theme = useTheme();
	const { channelProps, channelLineProps, changeProps, changeLineProps } = useChannel();
	const { user: localUser } = useUser();

	const channel = channelProps.selected?.channel;
	if (!channel) return;

  const isTinyScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
	const searchRef = useRef<HTMLInputElement>(null);

	const [searchResults, setSearchResults] = useState<Message[]>([]);
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (searchRef.current?.value) {
			const regex = new RegExp(searchRef.current.value, "i");
			const results = Array.from(messageLog.values())
				.filter((value) => value.content.match(regex))
			setSearchResults(results);
			setAnchorEl(event.currentTarget);
		} else {
			setSearchResults([]);
			setAnchorEl(null);
		}
	}

	const ResultPopover = () => {
		if (!searchResults.length) return (null);

		return (
			<Popover anchorEl={anchorEl} open={Boolean(anchorEl)} >
				<Stack
					spacing={theme.spacing(1)}
					padding={theme.spacing(1)}
				>
					{searchResults.map((message) => {
						const user = message.author;
						const timestamp = formatDate(message.timestamp);

						return (
							<Stack
								key={message.id}
								direction={'row'}
								spacing={1}
								minWidth={'17em'}
								alignItems="flex-start"
								sx={{
									cursor: 'pointer',
									backgroundColor: 'rgba(0, 0, 0, .05)',
									padding: theme.spacing(1),
									borderRadius: '8px',
									'&:hover .hidden-timestamp': {
										visibility: 'visible',
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
							);
						})}
					</Stack>
			</Popover>
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
					src={channel.image}
					avatarSx={ isTinyScreen
						? { height: '40px', width: '40px' }
						: { height: '55px', width: '55px'} }
					clickEvent={() => changeProps({ state: ChannelStates.details })}
				>
					{!channel.image && <DefaultChannelIcon />}
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
						sx={{ fontSize: 'small', }}
					> 
						{`${channel.onlineMembers || '0'} ${(channel.onlineMembers || 1) > 1 ? 'members' : 'member'} active`}
					</Typography>
				</Stack>
			</Stack>

			<SearchBar inputChange={handleChange} ref={searchRef} />
			<ResultPopover />
		</Stack>
	);
}
