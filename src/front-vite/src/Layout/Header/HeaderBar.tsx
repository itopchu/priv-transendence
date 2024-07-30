import React from 'react';
import { MenuDrawer } from './Navigation/Menu/MenuDrawer';
import { Box, IconButton, Stack } from '@mui/material';
import { useUser } from '../../Providers/UserContext/User';
import { AccountCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

export const HeaderBar: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const theme = useTheme();

  console.log(user.image);

  return (
    <Stack
      bgcolor={theme.palette.primary.dark}
      justifyContent={'space-between'}
      alignContent={'center'}
      alignItems={'center'}
      position={'fixed'}
      paddingY={'0.3em'}
      paddingX={'0.3em'}
      direction={'row'}
      width={'100%'}
      height={'3em'}
      zIndex={'50'}
      borderBottom={1}
      borderColor={theme.palette.divider}
    >
      <MenuDrawer />
      <IconButton
        sx={{
          p: 0,
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
          aspectRatio: '1:1',
          height: '100%',
          '&:hover': {
            '& > *': {
              transform: 'scale(1.4)',
              transition: 'transform 0.3s ease',
            },
          },
          '& img': {
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: '1:1',
            objectFit: 'cover',
            transition: 'transform 0.3s ease',
          },
          '& svg': {
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: '1:1',
            objectFit: 'cover',
            transition: 'transform 0.3s ease',
          },
        }}
      >
        {user && user.image ? (
          <img
            src={user.image || ''}
            alt="User"
          />
        ) : (
          <AccountCircle sx={{ aspectRatio: '1:1', color: theme.palette.secondary.main, fontSize: '2.5rem', maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
        )}
      </IconButton>
    </Stack>
  );
};

export default HeaderBar;
