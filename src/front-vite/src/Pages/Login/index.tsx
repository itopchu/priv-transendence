import React from 'react';
import { Box, Stack, Button, useTheme, Typography, alpha } from '@mui/material';

const LoginPage: React.FC = () => {
  const theme = useTheme();

  function goAuth() {
    window.location.href = import.meta.env.VITE_AUTH_URL;
  };
  return (
    <Box
      sx={{
        gap: '2em',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '2em',
      }}
    >
      <Stack
        spacing={4}
        bgcolor={alpha(theme.palette.background.default, 0.3)}
        borderRadius={'1em'}
        padding={'2em'}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: 'secondary.main',
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          Transcendence
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={goAuth}
          sx={{
            padding: '0.8em 2em',
            fontSize: '1em',
            fontWeight: 'bold',
            textTransform: 'none',
            boxShadow: `0 3px 5px 2px ${theme.palette.primary.dark}`,
            ':hover': {
              bgcolor: `${theme.palette.primary.main}`,
              boxShadow: `0 5px 7px 2px ${theme.palette.primary.main}`,
            },
          }}
        >
          SIGN IN
        </Button>
      </Stack>

    </Box>
  );
};

export default LoginPage;
