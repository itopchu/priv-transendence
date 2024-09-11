import React, { useState } from 'react';
import { Box, Divider, Typography, IconButton, Container, useTheme, Stack, Avatar } from '@mui/material';
import CreateCard from './CreateCard';
import {
  Add as AddIcon,
  Login as LoginIcon,
	MoreVertSharp as MiscIcon,
} from '@mui/icons-material';
import { useChannel } from '../../Providers/ChannelContext/Channel';
import ChatBox from './chats';
import { JoinCard } from './JoinCard';
import { SettingsBox } from './Settings/settings';

interface ChannelTypeEvent {
  component: React.ReactNode;
  newColor: string;
  name: string;
  isSelected: boolean;
  channelImage: string | undefined;
  clickEvent: () => void;
  iconClickEvent: () => void;
}

export type SelectedType = {
	join: number | undefined,
	channel: number | undefined,
	settings: number | undefined,
}

const initialSelected = {
	join: undefined,
	channel: undefined,
	settings: undefined,
}

const ChannelsPage: React.FC = () => {
  const theme = useTheme();
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [selected, setSelected] = useState<SelectedType>(initialSelected);
  const { memberships, publicChannels } = useChannel();

  const changeSelected = (selection: Partial<SelectedType>) => {
	  setSelected((prev) => ({
		  ...prev,
		  ...selection,
	  }))
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
			clickEvent={() => changeSelected({ join: index })}
			iconClickEvent={() => changeSelected({ join: index })}
		  />
        ))}
      </Stack>
    );
  };

  let generateJoinedChannels = () => {
		if (!memberships.length) return;

      return (
        <Stack gap={1}>
          {memberships.map((membership, index) => (
			<ChannelLine
			  key={index}
			  name={membership.channel.name}
			  component={<MiscIcon />}
			  newColor={"white"}
			  isSelected={selected.channel === index || selected.settings === index}
			  channelImage={membership.channel?.image}
			  clickEvent={() => changeSelected({ channel: index, settings: undefined })}
			  iconClickEvent={() =>  changeSelected({ channel: undefined, settings: index })}
			/>
		  ))}
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

  let lonelyBox = () => {
	  return  (
		<Box
			sx={{
				position: 'relative',
				height: '80vh',
				backgroundColor: theme.palette.primary.light,
				display: 'flex',
				flexDirection: 'column',
				padding: theme.spacing(2),
				justifyContent: 'center',
				alignItems: 'center'
			}}
		>
			<span style={{fontSize: '50px', fontWeight: 'bold', opacity: '0.5'}}>SUCH EMPTINESS</span>
		</Box>
	  )
  }

  let pageContainer = () => {
    return (
      <Container sx={{ padding: theme.spacing(3) }}>
		{showCreateCard && (<CreateCard setIsVisible={setShowCreateCard} />)}
		{selected.join !== undefined && (<JoinCard setSelected={setSelected} channel={publicChannels[selected.join]}/>)}
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
		    {selected.settings !== undefined ? (
				<SettingsBox membership={memberships[selected.settings]} setSelected={setSelected} />
			) : selected.channel !== undefined ? (
				<ChatBox channel={memberships[selected.channel].channel} />
			) : (
				lonelyBox()
			)}
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
