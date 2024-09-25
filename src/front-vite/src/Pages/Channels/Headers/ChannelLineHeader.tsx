import { Fab, Stack, Typography, useTheme } from "@mui/material";
import {useChannel } from "../../../Providers/ChannelContext/Channel";
import {  Channel, ChannelFilters, ChannelFilterValues, ChannelType } from "../../../Providers/ChannelContext/Types"
import { retryOperation } from "../../../Providers/ChannelContext/utils";
import { BACKEND_URL, handleError } from "../utils";
import axios from "axios";
import {
  Add as AddIcon,
} from '@mui/icons-material';

export const ChannelLineHeader: React.FC<{AddIconClick: () => void}> = ({ AddIconClick }) => {
	const theme = useTheme();
	const { channelProps, channelLineProps: lineProps, changeLineProps } = useChannel();

	const getPublicChannels = async (type: ChannelType) => {
		try {
			const channels: Channel[] = await retryOperation(async () => {
				const response = await axios.get(`${BACKEND_URL}/channel/public/${type}`, {
					withCredentials: true,
				});
				return (response.data.channels || []);
			})
			changeLineProps({ channels });
		} catch(error) {
			if (!axios.isCancel(error)) {
				handleError(`Unable to get ${type} channels:`,  error);
			}
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
				changeLineProps({ channels: channelProps.memberships.map((membership) => membership.channel) });
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
