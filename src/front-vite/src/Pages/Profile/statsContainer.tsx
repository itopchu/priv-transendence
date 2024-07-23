import React, { Dispatch, SetStateAction } from 'react';
import { User } from '../../Providers/UserContext/User';
import { Avatar, Stack, Divider, Typography, useTheme, Grid, IconButton, Box } from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  EmojiEvents as Cup,
  PersonAdd as AddIcon,
  Block as BlockIcon,
  VideogameAsset as GameIcon,
  Message as MessageIcon,
  PersonOff as PersonOffIcon,
} from '@mui/icons-material';
import { darken, alpha } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';


interface StatsContainerProps {
  owner: User | undefined;
  setOwner: Dispatch<SetStateAction<User | undefined>>;
}

export const StatsContainer: React.FC<StatsContainerProps> = ({ owner, setOwner }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  let gameStats = () => {
    // Fetch game stats to show
    const stat = [
      { title: 'Total', value: 100, rate: '75%' },
      { title: 'Vanilla', value: 25, rate: '25%' },
      { title: 'Custom', value: 8, rate: '8%' },
    ];

    return (
      <Stack
        direction={'row'}
        width={'100%'}
        borderBottom={1}
        borderColor={theme.palette.divider}
        padding={'0.3em'}
        bgcolor={alpha(theme.palette.background.default, 0.1)}
        justifyContent={'space-around'}
        divider={<Divider orientation='vertical' />}
        flex={1}
      >
        {stat.map((item, idx) => (
          <Stack
            direction={'row'}
            key={idx}
            flex={1}
            gap={'0.3em'}
            alignItems="center"
            justifyContent="center"
            overflow={'hidden'}
          >
            <Typography variant="body2">{`${item.title}`}</Typography>
            <Cup sx={{ color: (theme) => theme.palette.secondary.main }} />
            <Typography variant="body1">{item.rate}</Typography>
          </Stack>
        ))}
      </Stack>
    );
  }

  let gameLine = () => {
    return (
      <Stack
        direction={'row'}
        gap={1}
        justifyContent={'space-around'}
        alignContent={'center'}
        textAlign={'center'}
        bgcolor={alpha(theme.palette.background.default, 0.3)}
        borderRadius={'2em'}
        padding={'0.3em'}
      >
        <Typography alignContent={'center'} textAlign={'center'}>Type</Typography>
        <Typography alignContent={'center'} textAlign={'center'}>Custom</Typography>
        <Typography alignContent={'center'} textAlign={'center'}>9:15</Typography>
        <Typography alignContent={'center'} textAlign={'center'}>Opponent Name</Typography>
        <Avatar />
      </Stack>
    );
  };

  let gameHistory = () => {
    return (
      <Stack
        sx={{
          overflowY: 'scroll',
          scrollbarWidth: 'none', // For Firefox
          msOverflowStyle: 'none', // For IE and Edge
          '&::-webkit-scrollbar': {
            display: 'none', // For Chrome, Safari, Opera
          },
        }}
        gap={1}
        padding={'0.5em'}
        direction="column"
        width={'100%'}
        height={'100%'}
      >
        {Array.from({ length: 40 }).map((_, index) => (
          <React.Fragment key={index}>
            {gameLine()}
          </React.Fragment>
        ))}
      </Stack>
    );
  };

  return (
    <Stack
      width={'100%'}
      padding={'0.3em'}
      maxHeight={isSmallScreen ? '80vh' : '80vh'}
      overflow={'hidden'}
    >
      {gameStats()}
      {gameHistory()}
    </Stack>
  );
};
export default StatsContainer;