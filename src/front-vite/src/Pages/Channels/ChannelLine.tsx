import { Avatar, CircularProgress, Divider, Fab, IconButton, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { LoadingBox, SearchBar } from "./Components/Components";
import { useChannel } from "../../Providers/ChannelContext/Channel";
import React, { useRef, useState } from "react";
import {
  Add as AddIcon,
  Login as LoginIcon,
	InfoOutlined as MiscIcon,
	People as DefaultChannelIcon,
} from '@mui/icons-material';
import { Channel, ChannelFilters, ChannelFilterValues, ChannelMember, ChannelStates, ChannelType } from "../../Providers/ChannelContext/Types";
import { StatusTypography } from "./Components/ChatBoxComponents";
import { retryOperation } from "../../Providers/ChannelContext/utils";
import { BACKEND_URL, formatErrorMessage } from "./utils";
import axios from "axios";

interface ChannelCardType {
  component: React.ReactNode;
  newColor: string;
  name: string;
  isSelected: boolean;
  channelImage: string | undefined;
  clickEvent: () => void;
  iconClickEvent: () => void;
}

interface ChannelLineType {
	onPlusIconClick: () => void;
}

export const ChannelLine: React.FC<ChannelLineType> = ({ onPlusIconClick }) => {
	const theme = useTheme();
	const isTinyScreen = useMediaQuery(theme.breakpoints.down('sm'));
	const { channelLineProps, channelProps, changeProps, changeLineProps } = useChannel();

	const searchRef = useRef<HTMLInputElement>(null);
	const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
	const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

	function	onLineInputChange(): void {
		if (!searchRef.current) return;

		const regex = new RegExp(searchRef.current.value, "i");
		const channels = channelLineProps.filter === ChannelFilters.myChannels
			? channelProps.memberships.map((membership) => membership.channel)
			: channelLineProps.channels

		setFilteredChannels(channels.filter((channel) => channel.name.match(regex)));
	}

	function	channelCardClick(membership: ChannelMember | undefined, state: ChannelStates) {
		if (isTinyScreen) {
			changeLineProps({ hidden: true });
		}
		changeProps({ selected: membership, state });
	}

	const ChannelLineHeader = () => {
		const theme = useTheme();
		const { channelProps, channelLineProps: lineProps, changeLineProps } = useChannel();

		let controller: AbortController | undefined = undefined;

		const getPublicChannels = async (type: ChannelType) => {
			changeLineProps({ loading: true });
			try {
				const channels: Channel[] = await retryOperation(async () => {
					const response = await axios.get(`${BACKEND_URL}/channel/public/${type}`, {
						withCredentials: true,
						signal: controller?.signal,
					});
					return (response.data.channels || []);
				})
				changeLineProps({ channels });
			} catch(error) {
				if (!axios.isCancel(error)) {
					setErrorMessage(formatErrorMessage(`Unable to get ${type} channels:`, error));
				}
			}
			changeLineProps({ loading: false });
		};

		const onChangeChannelFilter = (filter: ChannelFilters) => {
			if (filter === lineProps.filter) return;

			controller?.abort();
			controller = new AbortController();
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
						onClick={onPlusIconClick}
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

  const ChannelCard: React.FC<ChannelCardType> = ({
		component,
		newColor,
		name,
		isSelected,
		channelImage,
		clickEvent,
		iconClickEvent
	}) => (
		<Stack
			direction={'row'}
			gap={2}
			paddingX={'0.5em'}
			onClick={clickEvent}
			bgcolor={isSelected ? theme.palette.primary.dark : theme.palette.primary.main}
			justifyContent={'space-between'}
			alignItems={'center'}
			textAlign={'center'}
			minWidth={'218px'}
			sx={{
				width: '100%',
				cursor: 'pointer',
				transition: 'padding-left ease-in-out 0.3s, padding-right ease-in-out 0.3s, border-radius ease-in-out 0.3s, background-color ease-in-out 0.3s',
				paddingLeft: isSelected ? '1em' : '0.5em',
				paddingRight: isSelected ? '0.02em' : '0em',
				borderRadius: isSelected ? '1.9em' : '0em',
				'&:hover': {
					bgcolor: theme.palette.primary.dark,
					borderRadius: '2em',
					paddingLeft: '1em',
					paddingRight: '0.02em',
				},
			}}
		>
			<Avatar src={channelImage} sx={{ width: '1.5em', height: '1.5em' }} >
				{!channelImage && <DefaultChannelIcon />}
			</Avatar>
			<Typography noWrap sx={{
				maxWidth: '78%',
				overflow: 'hidden',
				textOverflow: 'ellipsis',
				whiteSpace: 'nowrap'
			}}>
				{name}
			</Typography>
			<IconButton
			onClick={(event) => { event.stopPropagation(); iconClickEvent(); }}
			sx={{
				minWidth: '10%',
				width: '40px',
				height: '40px', 
				'&:hover': {
					color: newColor,
				},
			}}>
				{component}
			</IconButton>
		</Stack>
  );
  let generateChannels = () => {
		const isMyChannels = channelLineProps.filter === ChannelFilters.myChannels;
		const channels = searchRef.current?.value.length
			? filteredChannels
			: channelLineProps.channels
		if (!channels.length) return;

		return (
			<Stack gap={1}>
				{channels.map((channel) => {
					const membership = channelProps.memberships.find((membership) => membership.channel.id === channel.id);

					return (
						<ChannelCard
							key={channel.id}
							name={channel.name}
							component={isMyChannels ? <MiscIcon /> : <LoginIcon />}
							newColor={isMyChannels ? "lightskyblue" : "green"}
							isSelected={isMyChannels ? membership?.id === channelProps?.selected?.id : channelProps.selectedJoin?.id === channel.id}
							channelImage={channel?.image}
							clickEvent={() =>
								isMyChannels
									? channelCardClick(membership, ChannelStates.chat)
									: changeProps({ selectedJoin: channel })
							}
							iconClickEvent={() =>
								isMyChannels
									? channelCardClick(membership, ChannelStates.details)
									: changeProps({ selectedJoin: channel })
							}
						/>
					);
				})}
			</Stack>
		);
  };

	return (
		<Stack
			display={channelLineProps.hidden ? 'none' : 'flex'}
			direction={'column'}
			height={'80vh'}
			bgcolor={theme.palette.primary.light}
			sx={{
				minWidth: '250px',
				width: '250px',
				overflowY: 'auto',
			}}
		>
			<ChannelLineHeader />
			<Divider sx={{ bgcolor: theme.palette.secondary.dark }} />
			<Stack
				padding='1em'
				sx={{ overflowY: 'auto', maxHeight: '100%' }}
				divider={<Divider orientation='horizontal' flexItem />}
				gap={1}
			>
				<Stack gap={1} >
					<SearchBar
						ref={searchRef}
						inputChange={onLineInputChange}
					/>
					<StatusTypography
						hidden={!Boolean(errorMessage)}
						sx={{
							alignSelf: 'center',
							color: theme.palette.error.main,
						}}
					>
						{errorMessage}
					</StatusTypography>
				</Stack>
			{!channelLineProps.loading && generateChannels()}
			</Stack>
			{channelLineProps.loading && (
				<LoadingBox>
					<CircularProgress size={70} />
				</LoadingBox>
			)}
		</Stack>
	);
}
