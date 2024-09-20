import React, { useState, useEffect } from 'react';
import { Typography, Box, Switch, Stack, useTheme, Button, TextField } from '@mui/material';
import { useUser } from '../../Providers/UserContext/User';
import axios from 'axios';

export const Auth2F: React.FC = () => {
  const theme = useTheme();
  const { user, setUser } = useUser();
  const [auth2FEnabled, setAuth2FEnabled] = useState(user?.auth2F);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [isScanned, setIsScanned] = useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [hasError, setHasError] = useState<boolean>(false);
  const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost:4000';

  useEffect(() => {
    setAuth2FEnabled(user?.auth2F);
  }, [user]);

  async function generateQR() {
    try {
      const response = await axios.get(BACKEND_URL + '/auth/QRCode', { withCredentials: true, responseType: 'blob' });
      const qrData = response.data;
      setQrImage(URL.createObjectURL(qrData));
    } catch (error) {
      await resetPage();
      console.error('Error generating QR code', error);
    }
  }

  const resetPage = async () => {
    setQrImage(null);
    setIsScanned(false);
    setVerificationCode('');
    setAuth2FEnabled(user.auth2F);
    setHasError(false);
  }

  const verifyQR = async () => {
    try {
      const response = await axios.post(BACKEND_URL + '/auth/QRCode', { verificationCode: verificationCode }, { withCredentials: true });
      if (response.data.userClient) {
        setUser(response.data.userClient);
        await resetPage();
      }
    } catch (error) {
      setHasError(true);
      setVerificationCode('');
    }
  };

  const deleteQR = async () => {
    try {
      const response = await axios.delete(BACKEND_URL + '/auth/QRCode', { withCredentials: true });
      if (response.data.userClient) {
        setUser(response.data.userClient);
      }
      await resetPage();
    } catch (error) {
      console.error('Error deleting QR code', error);
    }
  };

  function handleToggle() {
    setAuth2FEnabled((prevState) => {
      const newAuth2FEnabled = !prevState;
      setQrImage(null);
      setIsScanned(false);
      setVerificationCode('');
      if (newAuth2FEnabled) {
        generateQR();
      } else {
        deleteQR();
      }
      return newAuth2FEnabled;
    });
  }

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
      gap={2}
    >
      <Stack
        direction={'column'}
        display={'flex'}
        justifyContent={'center'}
        alignItems={'center'}
        gap={1}
        padding={'0.3em'}
      >
        <Stack direction={'column'}>
          <Switch
            color='secondary'
            checked={auth2FEnabled}
            onChange={handleToggle}
          />
          <Typography variant="body1">
            {auth2FEnabled ? 'Enabled' : 'Disabled'}
          </Typography>
        </Stack>
        {auth2FEnabled && (
          user.auth2F ? (
            <Box
              bgcolor={theme.palette.success.main}
              color={theme.palette.background.default}
              textAlign={'center'}
              borderRadius={'1em'}
              fontWeight={'bold'}
              width={'100%'}
            >
              You are secured with 2FA!
            </Box>
          ) : (
            isScanned ? (
              <Stack padding={'0'} width={'100%'} gap={2} textAlign={'center'}>
                <Typography variant="body2" color="secondary">
                  Please verify the TOTP code using your authentication app
                </Typography>
                <TextField
                  color={hasError ? 'error' : 'secondary'}
                  variant="outlined"
                  label="Verification Code"
                  inputProps={{ maxLength: 6 }}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  fullWidth
                />
                <Button
                  fullWidth
                  variant='contained'
                  color='secondary'
                  onClick={verifyQR}
                  sx={{
                    borderRadius: '1em',
                    fontWeight: 'bold',
                  }}
                >
                  Submit
                </Button>
              </Stack>
            ) : (
              <Stack direction={'column'} gap={1} width={'100%'}>
                {qrImage ? (
                  <>
                    <img src={qrImage} alt="QR Code" />
                    <Button
                      fullWidth
                      variant='contained'
                      color='secondary'
                      onClick={() => { setIsScanned(true) }}
                      sx={{
                        borderRadius: '1em',
                        fontWeight: 'bold',
                      }}
                    >
                      Click if scanned
                    </Button>
                  </>
                ) : (
                  'Loading QR Code...'
                )}
              </Stack>
            )
          )
        )}
      </Stack>
      {infoSection()}
    </Stack>
  );
}

export default Auth2F;