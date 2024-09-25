import {
	Stack,
	Typography,
	useMediaQuery,
	useTheme
} from "@mui/material";
import {
	Menu as ShowChannelLineIcon,
	MenuOpen as HideChannelLineIcon,
} from "@mui/icons-material"
import { ButtonAvatar, ClickTypography, HeaderIconButton, SearchBar } from "../Components/Components";
import { useChannel } from "../../../Providers/ChannelContext/Channel";
import { ChannelStates } from "../../../Providers/ChannelContext/Types";

export const ChatBoxHeader = () => {
	const theme = useTheme();
	const { channelProps, channelLineProps, changeProps, changeLineProps } = useChannel();

	const channel = channelProps.selected?.channel;
	if (!channel) return;

  const isTinyScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

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
				/>
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

			<SearchBar />
		</Stack>
	);
}
