import React, { useState } from 'react';
import { Typography, Box, Switch, Stack, useTheme } from '@mui/material';
import { useUser } from '../../Providers/UserContext/User';
import axios from 'axios';

export const Auth2F: React.FC = () => {
  const theme = useTheme();
  const { user } = useUser();
  const [ auth2FEnabled, setAuth2FEnabled ] = useState(user?.auth2F);
  const [ qrUrl, setQrUrl ] = useState<string | null>(null);

  const generateQR = async () => {
    try {
      const response = await axios.get('/auth/qr', { withCredentials: true });
      setQrUrl(response.data.qrUrl);
    } catch (error) {
      console.error('Error generating QR code', error);
    }
  };

  const handleToggle = () => {
    if (auth2FEnabled) {
      // Disable 2FA in backend
    }
    else {
      generateQR()
      // Enable 2FA in backend
    }
    setAuth2FEnabled(!auth2FEnabled);
  };

  const infoSection = () => {
    return (
      <Stack
        gap={1}
        bgcolor={theme.palette.action.hover}
        borderRadius={'1em'}
      >
        <Typography
          textAlign='justify'
          padding={'1em'}
          bgcolor={theme.palette.action.hover}
          borderRadius={'1em'}
        >
          Two-factor authentication is a method of confirming users' claimed identities by using a combination of two different factors.
        </Typography>
        <Typography textAlign='justify' alignSelf={'center'}>
          These factors include:
        </Typography>
        <Stack
          justifyContent={'left'}
          bgcolor={theme.palette.action.hover}
          borderRadius={'1em'}
          padding={'1em'}
          direction={'column'}
          gap={'0.5em'}
        >
          <Typography>
            Something they know
          </Typography>
          <Typography>
            Something they have
          </Typography>
          <Typography>
            Something they are
          </Typography>
        </Stack>
      </Stack>
    );
  };

  return (
    <Stack
      direction="column"
      justifyContent="space-between"
      height="100%"
    >
      <Stack
        direction={'row'}
        display={'flex'}
        justifyContent={'center'}
        alignItems={'center'}
        gap={1}
        padding={'0.3em'}
      >
        {auth2FEnabled && (
          user.auth2F ? (
            <Box
              bgcolor={theme.palette.background.default}
              borderRadius={'1em'}
              width={'100%'}
            >
              You are secured with 2FA!
            </Box>
          ) : (
            <Box>
              {/* {qrUrl && <QRCode value={qrUrl} />} */}
            </Box>
          )
        )
        }
        <Switch
          color='secondary'
          checked={auth2FEnabled}
          onChange={handleToggle}
        />
        <Typography variant="body1">
          {auth2FEnabled ? 'Enabled' : 'Disabled'}
        </Typography>
      </Stack>
      {infoSection()}
    </Stack>
  );
}

export default Auth2F;