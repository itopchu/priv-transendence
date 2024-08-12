import React, { useEffect, useState } from 'react';
import { UserPublic, useUser } from '../../Providers/UserContext/User';
import { Avatar, Stack, Divider, Typography, useTheme, Grid, IconButton, Box } from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  PersonOff as PersonOffIcon,
} from '@mui/icons-material';
import { darken, alpha } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import axios from 'axios';

interface FriendsBoxProps {
  visitedUser: UserPublic | undefined;
}

const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';

export const FriendsBox: React.FC<FriendsBoxProps> = ({ visitedUser }) => {
  const theme = useTheme();
  const [friends, setFriends] = useState<UserPublic[]>([]);

  // get friends
  useEffect(() => {
    const getFriends = async () => {
      const response = await axios.get(BACKEND_URL + `/user/friends/${visitedUser?.id}`, {withCredentials: true});
      if (response.data.friendsDTO)
        setFriends(response.data.friendsDTO);
    }
    getFriends();
    console.log(friends);
    return () => { setFriends([]) }
  }, [])

  let friendLine = () => {
    return (
      <Stack direction={'row'}
        sx={{
          cursor: 'pointer',
          justifyContent: 'space-between',
          paddingX: '1em',
          alignItems: 'center',
          height: '3.1em',
        }}
      >
        <Stack direction={'row'} spacing={2} alignContent='center' alignItems={'center'} marginY={theme.spacing(.5)}>
          <AccountCircleIcon />
          <Typography sx={{ '&:hover': { color: theme.palette.secondary.dark } }}>
            UserName
          </Typography>
        </Stack>
        <Stack direction={'row'} spacing={2} alignContent='center' alignItems={'center'} marginY={theme.spacing(.5)}>
          <Stack onClick={(event) => { event.stopPropagation(); }}
            sx={{ cursor: 'pointer', '&:hover': { color: theme.palette.error.dark } }}
          >
            <PersonOffIcon />
          </Stack>
        </Stack>
      </Stack>
    );
  };

  let friendCategory = () => {
    return (
      <Stack
        direction='column'
        bgcolor={theme.palette.primary.main}
        spacing={'0.3em'}
        marginY={'0.3em'}
        sx={{
          minWidth: '250px',
          width: '100%',
          '& > *': {
            alignItems: 'center',
            height: '3em',
            color: theme.palette.secondary.main,
            marginY: '0.3em',
            boxShadow: `0px ${theme.spacing(0.5)} ${theme.spacing(0.75)} rgba(0, 0, 0, 0.2)`,
            backgroundColor: alpha(theme.palette.background.default, 0.5),
            transition: 'border-radius 0.2s ease, boxShadow 0.2s ease',
            '&:hover': {
              boxShadow: `0px ${theme.spacing(0.5)} ${theme.spacing(0.75)} rgba(0, 0, 0, 1)`,
              backgroundColor: alpha(theme.palette.background.default, 0.9),
              borderRadius: '2em',
            },
          },
        }}
      >
        {friendLine()}
        {friendLine()}
        {friendLine()}
        {friendLine()}
        {friendLine()}
        {friendLine()}
        {friendLine()}
        {friendLine()}
        {friendLine()}
        {friendLine()}
        {friendLine()}
      </Stack>
    );
  };

  let friendsBox = () => {
    return (
      <Stack
        maxHeight={'80vh'}
        border={1}
        borderColor={theme.palette.divider}
      >
        <Typography
          variant="h5"
          component="h2"
          align={'center'}
          padding={'0.3em'}
          textAlign={'center'}
        >
          Friends
        </Typography>
        <Stack
          borderTop={1}
          borderColor={theme.palette.divider}
          height={'100%'}
          bgcolor={theme.palette.primary.light}
          sx={{
            overflowY: 'scroll',
            '&.hide-scrollbar': {
              scrollbarWidth: 'none', /* Firefox */
              msOverflowStyle: 'none', /* IE and Edge */
              '&::-webkit-scrollbar': {
                display: 'none', /* Chrome, Safari, Opera */
              },
            },
          }}
          className="hide-scrollbar"
        >
          {friendCategory()}
          {friendCategory()}
        </Stack>
      </Stack>
    );
  };

  return (<> {friendsBox()} </>);
};
export default FriendsBox;