import { CircularProgress, Divider, Fab, IconButton, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { CustomAvatar, LoadingBox, scrollStyleSx, SearchBar } from "./Components/Components";
import { useChannel } from "../../Providers/ChannelContext/Channel";
import React, { useRef, useState } from "react";
import {
  Add as AddIcon,
  Login as LoginIcon,
  InfoOutlined as MiscIcon,
} from '@mui/icons-material';
import { ChannelBase, ChannelFilters, ChannelFilterValues, MemberClient, ChannelPublic, ChannelStates, ChannelType } from "../../Providers/ChannelContext/Types";
import { StatusTypography } from "./Components/ChatBoxComponents";
import { retryOperation } from "../../Providers/ChannelContext/utils";
import { formatErrorMessage } from "./utils";
import axios from "axios";
import { useChannelLine } from "../../Providers/ChannelContext/ChannelLine";
import { BACKEND_URL } from "../../Providers/UserContext/User";

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
	const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
	const { channelProps, changeProps } = useChannel();
	const { channelLineProps: lineProps, changeLineProps, setChannelLineProps } = useChannelLine();

	const searchRef = useRef<HTMLInputElement>(null);
	const [filteredChannels, setFilteredChannels] = useState<ChannelBase[]>([]);
	const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

	function	onLineInputChange(): void {
		if (!searchRef.current) return;

		const regex = new RegExp(searchRef.current.value, "i");
		const channels = lineProps.filter === ChannelFilters.myChannels
			? channelProps.memberships.map((membership) => membership.channel)
			: lineProps.channels

		setFilteredChannels(channels.filter((channel) => channel.name.match(regex)));
	}

	function	channelCardClick(membership: MemberClient | undefined, state: ChannelStates) {
		changeProps({ selected: membership, state });
		setChannelLineProps((prevProps) => (
			{ ...prevProps, hidden: isSmallScreen ? true : prevProps.hidden }
		));
	}

	const ChannelLineHeader = () => {
		let controller: AbortController | undefined = undefined;

		const getPublicChannels = async (type: ChannelType) => {
			changeLineProps({ loading: true });
			try {
				const channels: ChannelPublic[] = await retryOperation(async () => {
					const response = await axios.get(`${BACKEND_URL}/channel/type/${type}`, {
						withCredentials: true,
						signal: controller?.signal,
					});
					return (response.data.channels || []);
				})
				if (errorMessage) {
					setErrorMessage(undefined);
				}
				changeLineProps({ channels });
			} catch(error) {
				if (!axios.isCancel(error)) {
					setErrorMessage(formatErrorMessage(error, `Unable to get ${type} channels:`));
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

		const filterGroup = () => (
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
				paddingLeft: isSelected ? '.7em' : '0.5em',
				paddingRight: isSelected ? '0.02em' : '0em',
				borderRadius: isSelected ? '1em' : '0.2em',
				'&:hover': {
					bgcolor: theme.palette.primary.dark,
					borderRadius: '1em',
					paddingLeft: '.7em',
					paddingRight: '0.02em',
				},
			}}
		>
			<CustomAvatar
				variant='channel' 
				src={channelImage}
				sx={{
					width: '1.5em',
					height: '1.5em',
					border: 0,
					boxShadow: theme.shadows[3]
				}}
			/>
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
					borderRadius: '.7em',
					minWidth: '10%',
					width: '40px',
					height: '40px', 
					'&:hover': {
						color: newColor,
					},
				}}
			>
				{component}
			</IconButton>
		</Stack>
  );

  const generateChannels = () => {
		const isMyChannels = lineProps.filter === ChannelFilters.myChannels;
		const channels = searchRef.current?.value.length
			? filteredChannels
			: lineProps.channels
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
			display={lineProps.hidden ? 'none' : 'flex'}
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
				sx={{
					...scrollStyleSx,
					padding: '1em',
					overflowX: 'hidden',
					overflowY: 'auto',
					maxHeight: '100%',
				}}
				divider={<Divider orientation='horizontal' flexItem />}
				gap={1}
			>
				<Stack gap={1} >
					<SearchBar
						ref={searchRef}
						inputChange={onLineInputChange}
						sx={{ minWidth: '218px', maxWidth: '218px' }}
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
			{!lineProps.loading && generateChannels()}
			</Stack>
			{lineProps.loading && (
				<LoadingBox>
					<CircularProgress size={70} />
				</LoadingBox>
			)}
		</Stack>
	);
}
