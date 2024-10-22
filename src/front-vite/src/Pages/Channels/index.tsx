import React, { useState } from 'react';
import { Divider, Container, useTheme, Stack, useMediaQuery } from '@mui/material';
import CreateCard from './CreateCard';
import { useChannel } from '../../Providers/ChannelContext/Channel';
import ChatBox from './ChatBox';
import { JoinCard } from './JoinCard';
import { LonelyBox, Overlay } from './Components/Components';
import { ChannelDetails } from './Settings/ChannelDetails';
import { ChannelLine } from './ChannelLine';
import { ChannelStates } from '../../Providers/ChannelContext/Types';
import { useChannelLine } from '../../Providers/ChannelContext/ChannelLine';

const ChannelsPage: React.FC = () => {
  const theme = useTheme();
	const isTinyScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { channelProps } = useChannel();
  const { channelLineProps, changeLineProps } = useChannelLine();

  const [showCreateCard, setShowCreateCard] = useState(false);
	
	const renderChannelState = () => {
		if (!channelProps.selected) return (<LonelyBox />);

		switch (channelProps.state) {
			case ChannelStates.chat:
				return (<ChatBox membership={channelProps.selected} />);
			case ChannelStates.details:
				return (<ChannelDetails membership={channelProps.selected} />);
			default:
				return (<LonelyBox />);
		}
	}

  let pageContainer = () => {
    return (
      <Container
				sx={{ padding: theme.spacing(3) }}
			>
				{showCreateCard && (<CreateCard setIsVisible={setShowCreateCard} />)}
				{channelProps.selectedJoin && <JoinCard />}
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
						sx={{ position: 'relative', overflow: 'hidden' }}
          >
						{renderChannelState()}
						{!channelLineProps.hidden && isTinyScreen &&
							<Overlay onClick={() => changeLineProps({ hidden: true })} />
						}
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
