import React from'react';
import { MenuDrawer } from './Navigation/Menu/MenuDrawer';
import { Box, IconButton, Stack } from '@mui/material';
import { useUser } from '../../Providers/UserContext/User';
import { AccountCircle } from '@mui/icons-material';
import { useNavigate } from'react-router-dom';
import { useTheme } from '@mui/material/styles';

export const HeaderBar: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const theme = useTheme();

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
        onClick={() => {navigate(`/profile/${user.id}`)}}
        sx={{
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position:'relative',
          height: '100%',
          aspectRatio: '1/1',
          boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.4)',
          '& img, & svg': {
            position: 'absolute',
            height: '100%',
            width: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s ease-in-out',
          },
          '&:hover img, &:hover svg': {
            transform:'scale(1.3)',
          },
        }}
      >
        {user && user.image? (
          <img src={user.image} alt="User profile" style={{ objectFit: 'cover' }} />
        ) : (
          <AccountCircle
            color='secondary'
            sx={{
              fontSize: 'inherit',
              width: '100%',
              height: '100%',
              boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.4)',
            }}
          />
        )}
      </IconButton>
    </Stack>
  );
};

export default HeaderBar;