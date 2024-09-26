import React, { useState } from 'react';
import { Divider, IconButton, Container, useTheme, Stack, useMediaQuery, Box, } from '@mui/material';
import CreateCard from './CreateCard';
import {
	KeyboardBackspace as BackIcon,
} from '@mui/icons-material';
import { useChannel } from '../../Providers/ChannelContext/Channel';
import ChatBox from './ChatBox';
import { JoinCard } from './JoinCard';
import { lonelyBox } from './Components/Components';
import { ChannelDetails } from './Settings/ChannelDetails';
import { ChannelLine } from './ChannelLine';
import { ChannelStates } from '../../Providers/ChannelContext/Types';

const ChannelsPage: React.FC = () => {
  const isSmallScreen = false//useMediaQuery(theme.breakpoints.down('md'));

  const theme = useTheme();

  const { channelProps, changeProps } = useChannel();
  const [showCreateCard, setShowCreateCard] = useState(false);

	const returnToChannels = () => {
		changeProps({ selected: undefined, state: undefined });
	}

	const renderChannelState = () => {
		if (!channelProps.selected) return (isSmallScreen ? undefined : lonelyBox());

		switch (channelProps.state) {
			case ChannelStates.chat:
				return (<ChatBox membership={channelProps.selected} />);
			case ChannelStates.details:
				return (<ChannelDetails membership={channelProps.selected} />);
			default:
				return (lonelyBox());
		}
	}

  let pageContainer = () => {
    return (
      <Container
				sx={{ padding: theme.spacing(3), position: 'relative' }}
			>
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
					divider={<Divider orientation='vertical' />}
          padding={'.7em'}
        >
					<ChannelLine onPlusIconClick={() => setShowCreateCard(true)} />
          <Stack
            width={'100%'}
            height={'80vh'}
						overflow={'auto'}
						sx={{ position: 'relative' }}
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
