import React from 'react';
import { Stack, Box, Typography, useTheme, Divider } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';

const entry = 'A modern web application to play Pong online with real-time multiplayer capabilities.';

const overview = 'A web development project centered on creating a single-page application (SPA) that allows users to play the classic game Pong against each other. The project emphasizes modern web development practices, utilizing NestJS for the backend, a TypeScript framework for the frontend, and PostgreSQL for the database. The application will feature a user-friendly interface, real-time multiplayer capabilities, a chat system, and robust security measures.'

// Objectives
const objectives = 'The objectives for the project are to develop a single-page application for playing Pong online, implement real-time multiplayer functionality, create a comprehensive user account system with OAuth, two-factor authentication, and user profiles, integrate a chat system featuring public and private channels, direct messaging, and user blocking, and ensure the application adheres to high security standards.'


// Technical Requirements
const requirements = 'The project requirements include developing the backend using NestJS, creating the frontend with a TypeScript framework of choice, using PostgreSQL as the database management system, ensuring compatibility with the latest stable versions of Google Chrome and one other web browser, and deploying the entire application via a single docker-compose up --build command, utilizing Docker in rootless mode for security.'

// Chat System
const chat = 'The chat system will include the creation of public, private, and password-protected channels, direct messaging between users, blocking functionality, channel administration capabilities such as setting passwords, kicking, banning, and muting users, and integration with the game invitation system.'

// Pong Game
const pong = 'The Pong gameplay will feature real-time matches between users, a matchmaking system for automatic player pairing, game customization options (e.g., power-ups, different maps) while retaining a classic mode, and responsiveness to network issues to ensure a smooth user experience.'

// Security Considerations
const security = 'The security measures will include hashing passwords before storing, protecting against SQL injection attacks, server-side validation of all forms and user inputs, and securely storing credentials, API keys, and environment variables in a .env file excluded from version control.'

const Home: React.FC = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  const sections = (name: string, text: string) => {
    return (
      <Stack
        overflow={'hidden'}
        bgcolor={theme.palette.primary.dark}
        padding={'1em'}
        borderRadius={'1em'}
        direction={'column'}
      >
        <Typography
          variant='h5'
          sx={{
            paddingTop: '0.2em',
            textAlign: 'left',
            display: 'inline-block',
            paddingX: '0.5em',
            marginRight: '0.3em',
            color: theme.palette.secondary.main,
            bgcolor: theme.palette.primary.main,
            borderTopLeftRadius: '0.5em',
            borderTopRightRadius: '0.5em',
            width: 'min-content',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
          }}
        >
          {name}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            padding: '0.7em',
            textAlign: 'justify',
            color: theme.palette.secondary.main,
            bgcolor: theme.palette.background.default,
            borderBottomLeftRadius: '1em',
            borderBottomRightRadius: '1em',
            borderTopRightRadius: '1em',
            border: '0.3em solid hotpink',
            borderColor: theme.palette.primary.main,
          }}
        >
          {text}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack
      bgcolor={theme.palette.primary.light}
      padding={'1em'}
      gap={'1em'}
      direction={'column'}
      minHeight={'100vh'}
    >
      <Stack
        gap={'1em'}
        direction={'column'}
        display={'flex'}
        justifyContent={'center'}
        alignItems={'center'}
        overflow={'hidden'}
        borderBottom={1}
        borderColor={theme.palette.secondary.main}
      >
        <Typography
          variant='h1'
          whiteSpace={'nowrap'}
          fontSize={'clamp(2rem, 7vw, 3rem)'}
          textAlign={'center'}
        >
          FT_TRANSCENDENCE
        </Typography>
        <Typography
          variant='h1'
          whiteSpace='nowrap'
          fontSize='clamp(0.1rem, 2.3vw, 1.1rem)'
          textAlign= 'center'
          paddingX= '0.3em'
        >
          {entry}
        </Typography>
      </Stack>
      {/* this part should contain sth interactive */}
      <Box
        display="grid"
        gridTemplateColumns={isSmallScreen ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))'}
        gap={isSmallScreen ? '1em' : '0.5em'}
      >
        <Box>
          {sections('Project Overview', overview)}
        </Box>
        <Box>
          {sections('Objectives', objectives)}
        </Box>
        <Box>
          {sections('Technical Requirements', requirements)}
        </Box>
        <Box>
          {sections('Security Considerations', security)}
        </Box>
        <Box>
          {sections('Chat System', chat)}
        </Box>
        <Box>
          {sections('Pong Game', pong)}
        </Box>
      </Box>
    </Stack>
  );
};

export default Home;
