import React, { useEffect } from 'react';
import { UserPublic } from '../../Providers/UserContext/User';
import { Avatar, Stack, Divider, Typography, useTheme, Box } from '@mui/material';
import {
  EmojiEvents as Cup,
} from '@mui/icons-material';
import { useMediaQuery } from '@mui/material';
import axios from 'axios';

interface StatsContainerProps {
  visitedUser: UserPublic;
}

interface GameHistory {
  id: number;
  player1Score: number;
  player2Score: number;
  winner: boolean;
  player1: UserPublic;
  player2: UserPublic;
}

const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost:4000';

export const StatsContainer: React.FC<StatsContainerProps> = ({ visitedUser }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [games, setGames] = React.useState<GameHistory[]>([]);


  useEffect(() => {
    const getGames = async () => {
      try {
        const response = await axios.get(BACKEND_URL + '/games/' + visitedUser.id, { withCredentials: true });
        if (response.data.gamesDTO) {
          setGames(response.data.gamesDTO);
          console.log('Games:', response.data.gamesDTO);
        }
      } catch (error) {
        console.error('Error logging out:', error);
      }
    }
    getGames();
  }, [visitedUser]);

  let gameLine = () => {
    return (
      <Stack
        direction={'row'}
        gap={1}
        justifyContent={'space-around'}
        alignContent={'center'}
        textAlign={'center'}
        bgcolor={theme.palette.primary.dark}
        borderRadius={'2em'}
        padding={'0.3em'}
      >
        <Typography alignContent={'center'} textAlign={'center'}>Type: Custom</Typography>
        <Typography alignContent={'center'} textAlign={'center'}>Score: 9:15</Typography>
        <Stack direction={'row'} gap={'1em'}>
          <Typography alignContent={'center'} textAlign={'center'}>Opponent Name</Typography>
          <Avatar />
        </Stack>
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
        bgcolor={theme.palette.primary.main}
      >
        {Array.from({ length: 40 }).map((_, index) => (
          <React.Fragment key={index}>
            {gameLine()}
          </React.Fragment>
        ))}
      </Stack>
    );
  };

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
        justifyContent={'space-around'}
        divider={<Divider orientation='vertical'/>}
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
            height={'2em'}
          >
            <Typography variant="body2">{`${item.title}`}</Typography>
            <Cup sx={{ color: (theme) => theme.palette.secondary.main }} />
            <Typography variant="body1">{item.rate}</Typography>
          </Stack>
        ))}
      </Stack>
    );
  }

  return (
    <Stack
      width={'100%'}
      maxHeight={isSmallScreen ? '80vh' : '80vh'}
      overflow={'hidden'}
    >
      {gameStats()}
      {gameHistory()}
    </Stack>
  );
};
export default StatsContainer;