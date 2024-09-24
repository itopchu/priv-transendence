import {
    IconButton,
	Stack,
	Typography,
	useMediaQuery,
	useTheme
} from "@mui/material";
import {
	KeyboardArrowLeft as HideChannelLineIcon,
	KeyboardArrowRight as ShowChannelLineIcon,
} from "@mui/icons-material"
import { ButtonAvatar, ClickTypography, SearchBar } from "../Components/Components";
import { useChannel } from "../../../Providers/ChannelContext/Channel";
import { ChannelStates } from "../../../Providers/ChannelContext/Types";

export const ChatBoxHeader = () => {
	const theme = useTheme();
	const { channelProps, channelLineProps, changeProps, changeLineProps } = useChannel();

	const channel = channelProps.selected?.channel;
	if (!channel) return;

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
			}}
		>
			<IconButton onClick={() => changeLineProps({ hidden: !channelLineProps.hidden })} >
				{!channelLineProps.hidden ? <HideChannelLineIcon fontSize="large" /> : <ShowChannelLineIcon fontSize="large" />}
			</IconButton>
			<ButtonAvatar
				src={channel.image}
				avatarSx={{ height: '55px', width: '55px' }}
				clickEvent={() => changeProps({ state: ChannelStates.details })}
			/>
			<Stack spacing={-1} >
				<ClickTypography
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
			<SearchBar style={{ marginLeft: 'auto' }} />
		</Stack>
	);
}
