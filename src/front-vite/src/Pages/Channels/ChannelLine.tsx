import { Avatar, CircularProgress, Divider, IconButton, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { LoadingBox, SearchBar } from "./Components/Components";
import { useChannel } from "../../Providers/ChannelContext/Channel";
import React, { useRef, useState } from "react";
import {
  Login as LoginIcon,
	InfoOutlined as MiscIcon,
} from '@mui/icons-material';
import { ChannelLineHeader } from "./Headers/ChannelLineHeader";
import { Channel, ChannelFilters, ChannelMember, ChannelStates } from "../../Providers/ChannelContext/Types";

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
	const	isTinyScreen = useMediaQuery(theme.breakpoints.down('sm'));
	const { channelLineProps, channelProps, changeProps, changeLineProps } = useChannel();

	const searchRef = useRef<HTMLInputElement>(null);
	const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);

	function	onLineInputChange(): void {
		if (!searchRef.current) return;

		const re = new RegExp(searchRef.current.value, "gi");
		const channels = channelLineProps.filter === ChannelFilters.myChannels
			? channelProps.memberships.map((membership) => membership.channel)
			: channelLineProps.channels

		setFilteredChannels(channels.filter((channel) => !channel.name.search(re)));
	}

	function	channelCardClick(membership: ChannelMember | undefined, state: ChannelStates) {
		if (isTinyScreen) {
			changeLineProps({ hidden: true });
		}
		changeProps({ selected: membership, state });
	}

  const ChannelCard: React.FC<ChannelCardType> = ({ component, newColor, name, isSelected, channelImage, clickEvent, iconClickEvent }) => {
    return (
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
        <Avatar src={channelImage} sx={{ width: '1.5em', height: '1.5em' }} />
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
  };

  let generateChannels = () => {
		if (!channelProps.memberships.length) return;

		const isMyChannels = channelLineProps.filter === ChannelFilters.myChannels;
		const channels = searchRef.current
			? searchRef.current.value.length ? filteredChannels
				: channelLineProps.channels
			: channelLineProps.channels

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
			<ChannelLineHeader AddIconClick={onPlusIconClick} />
			<Divider sx={{ bgcolor: theme.palette.secondary.dark }} />
			<Stack
				padding='1em'
				sx={{ overflowY: 'auto', maxHeight: '100%' }}
				divider={<Divider orientation='horizontal' flexItem />}
				gap={1}
			>
				<SearchBar
					ref={searchRef}
					inputChange={onLineInputChange}
				/>
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
