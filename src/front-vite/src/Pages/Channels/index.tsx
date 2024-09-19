import React, { useState } from 'react';
import { Divider, Typography, IconButton, Container, useTheme, Stack, Avatar, useMediaQuery, Box } from '@mui/material';
import CreateCard from './CreateCard';
import {
  Add as AddIcon,
  Login as LoginIcon,
	MoreVertSharp as MiscIcon,
	KeyboardBackspace as BackIcon,
} from '@mui/icons-material';
import { ChannelStates, useChannel } from '../../Providers/ChannelContext/Channel';
import ChatBox from './chatBox';
import { JoinCard } from './JoinCard';
import { lonelyBox } from './Components/Components';
import { ChannelDetails } from './Settings/ChannelDetails';
import { EditDetails } from './Settings/EditDetails';

interface ChannelTypeEvent {
  component: React.ReactNode;
  newColor: string;
  name: string;
  isSelected: boolean;
  channelImage: string | undefined;
  clickEvent: () => void;
  iconClickEvent: () => void;
}

const ChannelsPage: React.FC = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [showCreateCard, setShowCreateCard] = useState(false);
  const { memberships, publicChannels, channelProps, changeProps } = useChannel();

	const returnToChannels = () => {
		changeProps({ selected: undefined, state: undefined });
	}

  const ChannelLine: React.FC<ChannelTypeEvent> = ({ component, newColor, name, isSelected, channelImage, clickEvent, iconClickEvent }) => {
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

  let generateAvailableChannels = () => {
		if (isSmallScreen && channelProps.selected) return;
		if (!publicChannels.length) return;

    return (
      <Stack gap={1}>
        {publicChannels.map((channel, index) => (
          <ChannelLine
						key={index}
						name={channel.name}
						component={<LoginIcon />}
						newColor={"green"}
						isSelected={false}
						channelImage={channel?.image}
						clickEvent={() => changeProps({ selectedJoin: channel })}
						iconClickEvent={() => changeProps({ selectedJoin: channel })}
					/>
        ))}
      </Stack>
    );
  };

  let generateJoinedChannels = () => {
		if (isSmallScreen && channelProps.selected) return;
		if (!memberships.length) return;

		return (
			<Stack gap={1}>
				{memberships.map((membership, _) => {
					const channel = membership.channel;

					return (
						<ChannelLine
							key={channel.id}
							name={channel.name}
							component={<MiscIcon />}
							newColor={"white"}
							isSelected={channel.id === channelProps?.selected?.id}
							channelImage={channel?.image}
							clickEvent={() => changeProps({ selected: channel, state: ChannelStates.chat })}
							iconClickEvent={() =>  changeProps({ selected: channel, state: ChannelStates.details })}
						/>
					);
				})}
			</Stack>
		);
  };

  let createChannelButton = () => {
    return (
      <Stack
        minWidth={'218px'}
        maxWidth={'100%'}
        height={'48px'}
        direction={'row'}
        alignItems={'center'}
				paddingLeft={theme.spacing(3.2)}
        gap={1}
        bgcolor={theme.palette.primary.main}
        sx={{
          cursor: 'pointer',
          transition: 'background-color ease-in-out 0.3s, border-radius ease-in-out 0.3s',
          '&:hover': {
            borderRadius: '2em',
            bgcolor: theme.palette.primary.dark,
          },
        }}
				onClick={() => {setShowCreateCard(true)}}
      >
        <AddIcon />
        <Typography>
          Create a Channel
        </Typography>
      </Stack>
    );
  };

	const renderChannelState = () => {
		if (!channelProps.selected) return (isSmallScreen ? undefined : lonelyBox());

		switch (channelProps.state) {
			case ChannelStates.chat:
				return (<ChatBox channel={channelProps.selected} />);
			case ChannelStates.details:
				return (
					<ChannelDetails
						membership={memberships.find(membership => membership.channel.id === channelProps?.selected?.id)}
					/>
				);
			case ChannelStates.editMode:
				return (
					<EditDetails
						membership={memberships.find(membership => membership.channel.id === channelProps?.selected?.id)}
					/>
				);
			default:
				return (lonelyBox());
		}
	}

  let pageContainer = () => {
    return (
      <Container sx={{ padding: theme.spacing(3) }}>
				{isSmallScreen && channelProps?.selected && (
          <Box sx={{ alignSelf: 'flex-start' }}>
            <IconButton onClick={returnToChannels}>
							<BackIcon sx={{ fontSize: '36px' }} />
            </IconButton>
          </Box>
        )}
				{showCreateCard && (<CreateCard setIsVisible={setShowCreateCard} />)}
				{channelProps.selectedJoin && <JoinCard channel={channelProps.selectedJoin} />}
        <Stack
          direction={'row'}
          bgcolor={theme.palette.primary.dark}
          divider={<Divider orientation='vertical' flexItem />}
          padding={'1em'}
        >
          <Stack
            padding={'1em'}
            gap={1}
            direction={'column'}
            height={'80vh'}
            bgcolor={theme.palette.primary.light}
            divider={<Divider flexItem />}
            width={'250px'}
          >
            {createChannelButton()}
            <Stack
              sx={{ overflowY: 'auto', maxHeight: '100%' }}
              divider={<Divider orientation='horizontal' flexItem />}
              gap={2}
            >
              {generateJoinedChannels()}
              {generateAvailableChannels()}
            </Stack>
          </Stack>
          <Stack
            width={'100%'}
						overflow={'auto'}
          >
						{renderChannelState()}
          </Stack>
        </Stack>
      </Container>
    );
  };

  return (
      pageContainer()
  );
};

export default ChannelsPage;
