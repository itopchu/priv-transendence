import React, { Dispatch, SetStateAction } from 'react';
import { User, useUser } from '../../Providers/UserContext/User';
import { Avatar, Stack, Typography, useTheme, Grid, IconButton, Box } from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  PersonAdd as AddIcon,
  Block as BlockIcon,
  VideogameAsset as GameIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { darken, alpha } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

interface OwnerInfoProps {
  owner: User | undefined;
  setOwner: Dispatch<SetStateAction<User | undefined>>;
}

export const OwnerInfo: React.FC<OwnerInfoProps> = ({ owner, setOwner }) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useUser();

  let imagePart = () => {
    return (
      <Stack
        gap={1}
        direction={'column'}
        justifyContent={'center'}
        padding={'1em'}
      >
        <Avatar
          sx={{
            aspectRatio: '1:1',
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
            width: '100%',
            height: 'auto',
            minWidth: '115px',
            minHeight: '115px',
            maxHeight: '200px',
            maxWidth: '200px',
            border: '2px solid',
            borderColor: () => (
              owner?.status === 'online' ? theme.palette.success.main :
              owner?.status === 'offline' ? theme.palette.error.main :
              owner?.status === 'ingame' ? theme.palette.warning.main : theme.palette.action.hover
            ),
          }}
          src={owner?.image ?? ''}
          alt="owner"
        >
          {!owner?.image && <AccountCircleIcon sx={{ width: '100%', height: 'auto' }} />}
        </Avatar>
        {
          // owner?.id !== user.id && ////////// Temporarily outof order for development
          (
            <Stack direction={'column'}
              sx={{
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <Grid container justifyContent={'center'} alignContent={'center'} flexGrow={1}>
                <Grid item>
                  <IconButton
                    sx={{
                      '&:hover': {
                        color: theme.palette.primary.light,
                      },
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                </Grid>
                <Grid item>
                  <IconButton
                    sx={{
                      '&:hover': {
                        color: theme.palette.error.main,
                      },
                    }}
                  >
                    <BlockIcon />
                  </IconButton>
                </Grid>
                <Grid item>
                  <IconButton
                    sx={{
                      '&:hover': {
                        color: '#BF77F6',
                      },
                    }}
                  >
                    <GameIcon />
                  </IconButton>
                </Grid>
                <Grid item>
                  <IconButton
                    sx={{
                      '&:hover': {
                        color: theme.palette.secondary.main,
                      },
                    }}
                  >
                    <MessageIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </Stack>
          )
        }
      </Stack>
    );
  }

  let namePart = () => {
    return (
      <Stack
        direction={'column'}
        justifyContent={'center'}
        gap={1}
        padding={'1em'}
        bgcolor={darken(theme.palette.primary.dark, 0.3)}
        borderRadius={'1em'}
      >
        {owner?.nameNick && (
          <Typography sx={{ wordBreak: 'break-word', color: 'secondary.light' }}>
            {owner.nameNick}
          </Typography>
        )}
        {owner?.nameFirst && owner?.nameLast && (
          <Typography style={{ wordBreak: 'break-word' }}>
            {`${owner.nameFirst} ${owner.nameLast}`}
          </Typography>
        )}
        {owner?.greeting && (
          <Typography style={{ wordBreak: 'break-word' }}>
            {`${owner.greeting}`}
          </Typography>
        )}
      </Stack>
    );
  };

  return (
    <Stack
      direction={isSmallScreen ? 'column' : 'row'}
      justifyContent={'space-between'}
      padding={'1em'}
      gap={'1em'}
      bgcolor={theme.palette.primary.dark}
      borderBottom={1}
      borderColor={theme.palette.divider}
    >
      <Stack
        direction={'row'}
        gap={1}
        bgcolor={alpha(theme.palette.background.default, 0.5)}
        borderRadius={'1em'}
      >
        {imagePart()}
        {namePart()}
      </Stack>
      <Stack
        justifyContent={'center'}
        direction={isSmallScreen ? 'row' : 'column'}
        padding={'1em'}
        gap={2}
        bgcolor={alpha(theme.palette.background.default, 0.5)}
        borderRadius={'1em'}
      >
        {owner?.email && (
          <Typography sx={{ wordBreak: 'break-word' }}>
            <span style={{ color: theme.palette.secondary.light }}>Email:</span>
            <br />
            {owner.email}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
};

export default OwnerInfo;