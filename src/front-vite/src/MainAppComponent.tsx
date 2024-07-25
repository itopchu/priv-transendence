import React from 'react';
import { HeaderBar } from './Layout/Header/HeaderBar';
import { Bar as Footer } from './Layout/Footer/FooterBar';
import Main from './Layout/Main/index';
import { Box, Container, CssBaseline, Divider } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { themeOptions } from './Styles/themeOptions';
import { useUser } from './Providers/UserContext/User';
import './mainAppComponent.css';
import { Chat } from './Layout/Chat/index';

const MainAppComponent: React.FC = () => {
  const theme = createTheme(themeOptions);
  const { user } = useUser();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {user.id !== 0 && <HeaderBar />}
      <Container maxWidth="xl">
        <Box paddingTop={user.id === 0 ? '0em' : '3em'} bgcolor={theme.palette.primary.main}>
          <Main />
        </Box>
      </Container>
      <Divider orientation="horizontal" sx={{ backgroundColor: theme.palette.background.default, width: '0.01em', minWidth: '100%' }} />
      <Chat/>
      <Footer />
    </ThemeProvider>
  );
}

export default MainAppComponent;
