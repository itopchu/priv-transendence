import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container, useTheme } from '@mui/material';
import { styled } from '@mui/system';

const ErrorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  textAlign: 'center',
  padding: theme.spacing(3),
}));

const HomeLink = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  color: theme.palette.secondary.main,
  borderColor: theme.palette.secondary.main,
}));

const ErrorPage: React.FC = () => {
  const [showBlackScreen, setShowBlackScreen] = useState(true);
  const theme = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBlackScreen(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleHomeClick = () => {
    navigate('/');
  }

  if (showBlackScreen) {
    return <div style={{ backgroundColor: 'black', height: '100vh', width: '100vw' }} />;
  }

  return (
    <Container>
      <ErrorContainer>
        <Typography variant="h1" component="h1" gutterBottom>
          404
        </Typography>
        <Typography variant="body1" gutterBottom>
          Oops! The page you're looking for doesn't exist.
        </Typography>
        <HomeLink variant="outlined" onClick={handleHomeClick}>
          Go back to Home
        </HomeLink>
      </ErrorContainer>
    </Container>
  );
};

export default ErrorPage;
