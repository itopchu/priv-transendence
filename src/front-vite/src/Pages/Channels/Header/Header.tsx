import {
	Fab,
	IconButton,
	Stack,
	Typography,
	useTheme
} from "@mui/material";
import {
  Add as AddIcon,
} from "@mui/icons-material";
import { ButtonAvatar, ClickTypography, SearchBar } from "../Components/Components";
import { Channel, ChannelStates, ChannelType, useChannel } from "../../../Providers/ChannelContext/Channel";
import { BACKEND_URL, handleError, retryOperation } from "../utils";
import axios from "axios";

export const enum ChannelFilters {
	myChannels = 'My Channels',
	protected = 'Protected',
	public = 'Public',
}

export function getChannelTypeFromFilter(filter: ChannelFilters) {
	return (filter === ChannelFilters.protected ? ChannelType.protected : ChannelType.public);
}

const ChannelFilterValues: ChannelFilters[] = [
	ChannelFilters.myChannels,
	ChannelFilters.protected,
	ChannelFilters.public,
]

export const ChannelLineHeader: React.FC<{AddIconClick: () => void}> = ({ AddIconClick }) => {
	const theme = useTheme();
	const { channelLineProps: lineProps, changeLineProps } = useChannel();

	const getPublicChannels = async (type: ChannelType) => {
		changeLineProps({ loading: true });
		try {
			const channels: Channel[] = await retryOperation(async () => {
				const response = await axios.get(`${BACKEND_URL}/channel/public/${type}`, { withCredentials: true });
				return (response.data.channels || []);
			})
			changeLineProps({ channels });
		} catch(error) {
			handleError(`Unable to get ${type} channels:`,  error);
		}
		changeLineProps({ loading: false });
	};

	const onChangeChannelFilter = (filter: ChannelFilters) => {
		if (filter === lineProps.filter) return;

		switch (filter) {
			case ChannelFilters.protected:
				getPublicChannels(ChannelType.protected);
				break;
			case ChannelFilters.public:
				getPublicChannels(ChannelType.public);
				break;
			default:
				changeLineProps({ channels: [] });
		}
		changeLineProps({ filter });
	}

	const filterGroup = () => {
		return (
			<>
				{ChannelFilterValues.map((value) => (
					<Typography
						key={value}
						onClick={() => onChangeChannelFilter(value)}
						sx={{
							fontSize: 'small',
							cursor: 'pointer',
						}}
						color={
							value === lineProps.filter
								? undefined
								: 'textSecondary'
						}
					>
						{value}
					</Typography>
				))}
			</>
		);
	};

	return (
		<Stack
			paddingY={'.2em'}
			gap={.8}
			sx={{
				height: '64px',
				bgcolor: theme.palette.primary.main,
			}}
		>
			<Stack
				direction='row'
				justifyContent={'space-evenly'}
				alignItems={'center'}
			>
				<Typography variant='h5' >
					Channels
				</Typography>
				<Fab
					onClick={AddIconClick}
					sx={{ minHeight: 0, height: '28px', width: '28px', zIndex: 1 }}
				>
					<AddIcon />
				</Fab>
			</Stack>
			<Stack
				direction='row'
				gap={1}
				justifyContent={'center'}
			>
				{filterGroup()}
			</Stack>
		</Stack>
	);
}

export const SelectedChannelHeader = () => {
	const theme = useTheme();
	const { channelProps, changeProps } = useChannel();

	const channel = channelProps.selected?.channel;
	if (!channel) return;

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
					{`${channel.onlineMembers || '0'} ${(channel.onlineMembers || 0) > 1 ? 'members' : 'member'} online`}
				</Typography>
			</Stack>
			<SearchBar style={{ marginLeft: 'auto' }} />
		</Stack>
	);
}
