import React, { useEffect, useState } from 'react';
import { Divider, Container, useTheme, Stack, useMediaQuery } from '@mui/material';
import CreateCard from './CreateCard';
import { useChannel } from '../../Providers/ChannelContext/Channel';
import ChatBox from './ChatBox';
import { JoinCard } from './JoinCard';
import { lonelyBox, Overlay } from './Components/Components';
import { ChannelDetails } from './Settings/ChannelDetails';
import { ChannelLine } from './ChannelLine';
import { Channel, ChannelStates, Invite } from '../../Providers/ChannelContext/Types';
import { useLocation } from 'react-router-dom';
import { acceptInvite } from '../../Providers/ChannelContext/utils';

const ChannelsPage: React.FC = () => {
  const theme = useTheme();
	const location = useLocation();
	const isTinyScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const { channelProps, channelLineProps, changeLineProps, setChannelProps } = useChannel();
  const [showCreateCard, setShowCreateCard] = useState(false);
	
	useEffect(() => {
		const searchParams = new URLSearchParams(location.search);
		const invite: Invite = {
			id: searchParams.get('inviteId') || '',
			isJoined: Boolean(searchParams.get('isJoined')),
			destination: { id: Number(searchParams.get('destinationId')) } as Channel,
		}

		if (invite.id.length) {
			acceptInvite(invite, channelProps, setChannelProps);
		}
	}, [location])

	const renderChannelState = () => {
		if (!channelProps.selected) return (lonelyBox());

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
				sx={{ padding: theme.spacing(3) }}
			>
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
