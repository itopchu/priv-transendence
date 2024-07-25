import React, { useState } from 'react';
import {
  BoxProps,
  Typography,
  Box,
  useMediaQuery,
  Stack,
  useTheme,
  alpha,
  Divider
} from '@mui/material';
import { useUser } from '../../Providers/UserContext/User';
// import { } from '@mui/icons-material';
import PersonalInfo from './personalInfo';
import SocialSettings from './socialSettings';
import Auth2F from './2FA';

const UserSettings: React.FC = () => {
  const theme = useTheme();
  const { user } = useUser();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  const cardContainer = (props: React.PropsWithChildren<BoxProps>, name: string) => {
    return (
      <Stack
        width={'100%'}
        gap={'1em'}
        direction={'column'}
        alignItems={'center'}
        bgcolor={alpha(theme.palette.background.default, 0.2)}
        padding={'0.8em'}
        borderRadius={'1em'}
      >
        <Box
          textAlign={'center'}
          width={'100%'}
          minWidth={'200px'}
          paddingX={'1em'}
          bgcolor={theme.palette.primary.dark}
          borderRadius={'1em'}
        >
          <Typography fontWeight={'bold'} padding={'1em'}>
            {name}
          </Typography>
        </Box>
        {props.children}
      </Stack>
    );
  }

  return (
    <Stack gap={1} direction={'column'} minHeight={'100vh'} padding={'2em'} divider={<Divider orientation="horizontal" />}>
      <Box
        alignSelf={'flex-start'}
        justifyContent={'center'}
        fontWeight={'bold'}
        padding={'0.3em'}
        fontSize={'1.5em'}
      >
        Settings
      </Box>
      <Stack alignSelf={'center'} direction={isSmallScreen ? 'column' : 'row'} gap={3} width={'100%'} justifyContent={'space-around'} overflow={'clip'}>
        {cardContainer({ children: <PersonalInfo /> }, 'Personal Information')}
        {cardContainer({ children: <SocialSettings /> }, 'Social Settings')}
        {cardContainer({ children: <Auth2F /> }, '2FA Switch')}
      </Stack>
    </Stack>
  );
};

export default UserSettings;
