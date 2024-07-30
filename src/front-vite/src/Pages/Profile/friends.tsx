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

interface FriendsBoxProps {
  owner: User | undefined;
  setOwner: Dispatch<SetStateAction<User | undefined>>;
}

export const FriendsBox: React.FC<FriendsBoxProps> = ({ owner, setOwner }) => {
  const theme = useTheme();

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