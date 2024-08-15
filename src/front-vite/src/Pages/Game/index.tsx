import React, { ReactElement, useEffect, useState } from 'react';
import { Container, Stack, Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/system';

import io from 'socket.io-client';
import { useUser } from '../../Providers/UserContext/User';

const GameBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  width: '100%',
  paddingTop: '56.25%',
  position: 'relative',
}));

const HistoryBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  borderRadius: '1em',
}));

const MainContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.primary.dark,
}));

const socket = io('http://localhost.codam.nl:3001');

const Game: React.FC = () => {
  const theme = useTheme();
  const { user, setUser } = useUser();
  const [roomId, setRoomId] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [gameState, setGameState] = useState({
    player1: { y: 150 },
    player2: { y: 150 },
    ball: { x: 390, y: 190 },
    score: { player1: 0, player2: 0 },
  });
  const [buttonText, setButtonText] = useState('disconnect');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socket.on('state', (state) => {
      setGameState(state);
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });
    
    return () => {
      socket.off('state');
    };
  }, [socket]);

  const Play = () => {  
    const handleMouseMove = (e: { clientY: number; }) => {
      if (!roomId) return;
      const y = e.clientY - 50; // Adjust based on paddle height
      socket.emit('move', { roomId, userId: user.id, y });
    };
    
    const joinRoom = (roomId: string) => {
      socket.emit('joinRoom', { roomId: roomId, userId: user.id });
      setIsJoined(true);
    };

    const handleConnection = () => {
        if (buttonText === 'connect') {
          socket.connect();
          setButtonText('disconnect');
        }
        else if (buttonText === 'disconnect') {
          socket.disconnect();
          setButtonText('connect');
        }
    };

    if (!roomId || !isJoined) {
      return (
        <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}}>
          <button onClick={handleConnection}>{buttonText}</button>
          <h1>Oda Seç</h1>
          
          <input type="text" placeholder="Oda ID" onChange={(e) => setRoomId(e.target.value)} />
          <button onClick={() => joinRoom(roomId)}>Odaya Katil</button>
        </div>
      );
    }

    return (
      <div onMouseMove={handleMouseMove} 
      style={{ position: 'absolute', width: '80vw', height: '40vh', border: '1px solid black',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'}}>
        <div style={{ position: 'absolute', left: '10px', top: `${gameState.player1.y}px`, width: '10px', height: '100px', backgroundColor: 'blue' }}></div>
        <div style={{ position: 'absolute', right: '10px', top: `${gameState.player2.y}px`, width: '10px', height: '100px', backgroundColor: 'red' }}></div>
        <div style={{ position: 'absolute', left: `${gameState.ball.x}px`, top: `${gameState.ball.y}px`, width: '10px', height: '10px', backgroundColor: 'green', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)' }}>
          Score: {gameState.score.player1} - {gameState.score.player2}
        </div>
      </div>
    );
  };

  const handleSpeed = (speed: boolean) => {
    socket.emit('speed', speed);
  };

  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  return (
    <MainContainer>
      <Stack direction="column" spacing={2}>
        <Box
          sx={{
            backgroundColor: theme.palette.primary.main,
            padding: theme.spacing(2),
            borderRadius: theme.shape.borderRadius,
          }}
        >
          <Typography
            variant="h4"
            component="div"
            style={{
              color: theme.palette.secondary.main,
              textAlign: 'center',
            }}
          >
            Pong Game
          </Typography>
        </Box>
        <Box sx={{ backgroundColor: theme.palette.primary.main, padding: theme.spacing(2), borderRadius: theme.shape.borderRadius }}>
          <button onClick={() => handleSpeed(true)} style={{ fontSize: '24px' }}>⬆️</button>
          <button onClick={() => handleSpeed(false)} style={{ fontSize: '24px' }}>⬇️</button>
        </Box>
        <GameBox>
            <Play />
        </GameBox>
        <HistoryBox>
          <Typography
            variant='h4'
            sx={{
              paddingTop: '0.2em',
              textAlign: 'center',
              width: '11ch',
              color: theme.palette.secondary.main,
              bgcolor: theme.palette.primary.main,
              borderTopLeftRadius: '0.5em',
              borderTopRightRadius: '0.5em',
            }}
          >
            Pong (1972)
          </Typography>
          <Typography
            variant="body2"
            sx={{
              marginBottom: '1em',
              padding: '0.5em',
              textAlign: 'justify',
              color: theme.palette.secondary.main,
              bgcolor: theme.palette.primary.main,
              borderBottomLeftRadius: '1em',  
              borderBottomRightRadius: '1em',
              borderTopRightRadius: '1em',
            }}
          >
            {/* <Box bgcolor={theme.palette.background.default} borderRadius={'1em'} padding={'1em'}> */}
              Pong is one of the earliest arcade video games and the first sports arcade video game. It is a table tennis sports game featuring simple two-dimensional graphics. The game was originally manufactured by Atari, which released it in 1972. Allan Alcorn created Pong as a training exercise assigned to him by Atari co-founder Nolan Bushnell. Bushnell based the idea on an electronic ping-pong game included in the Magnavox Odyssey, which later resulted in a lawsuit against Atari.
            {/* </Box> */}
          </Typography>
          <Typography
            variant='h5'
            sx={{
              paddingTop: '0.2em',
              textAlign: 'center',
              width: '9ch',
              color: theme.palette.secondary.main,
              bgcolor: theme.palette.primary.main,
              borderTopLeftRadius: '0.5em',
              borderTopRightRadius: '0.5em',
            }}
          >
            Gameplay
          </Typography>
          <Typography
            variant="body2"
            sx={{
              marginBottom: '1em',
              padding: '0.5em',
              textAlign: 'justify',
              color: theme.palette.secondary.main,
              bgcolor: theme.palette.primary.main,
              borderBottomLeftRadius: '1em',
              borderBottomRightRadius: '1em',
              borderTopRightRadius: '1em',
            }}
          >
            <Stack
              bgcolor={theme.palette.background.default}
              borderRadius={'1em'}
              padding={'1em'}
              direction={isSmallScreen ? 'column' : 'row'}
              spacing={2}
            >
              <Box>
                Pong is a two-player game that simulates table tennis. Players control the paddles to hit the ball back and forth. The goal is to defeat the opponent by being the first one to gain a high score. The paddles move vertically along the left or right side of the screen. Players use the paddles to hit the ball back and forth. The game can be played with two human players, or one player against a computer controlled paddle.
              </Box>
              <Box
                component="img"
                src="https://upload.wikimedia.org/wikipedia/commons/6/62/Pong_Game_Test2.gif"
                alt="Pong Gameplay"
                width={isSmallScreen ? '100%' : 'auto'}
                height={'auto'}
                borderRadius={'1em'}
              />
            </Stack>
          </Typography>
          <Typography
            variant='h5'
            sx={{
              paddingTop: '0.2em',
              textAlign: 'center',
              width: '12ch',
              color: theme.palette.secondary.main,
              bgcolor: theme.palette.primary.main,
              borderTopLeftRadius: '0.5em',
              borderTopRightRadius: '0.5em',
            }}
          >
            Development
          </Typography>
          <Typography
            variant="body2"
            sx={{
              marginBottom: '1em',
              padding: '0.5em',
              textAlign: 'justify',
              color: theme.palette.secondary.main,
              bgcolor: theme.palette.primary.main,
              borderBottomLeftRadius: '1em',
              borderBottomRightRadius: '1em',
              borderTopRightRadius: '1em',
            }}
          >
            <Box bgcolor={theme.palette.background.default} borderRadius={'1em'} padding={'1em'}>
              The development of Pong was significant as it was one of the first video games to gain widespread popularity in both arcade and Game console formats. It led to the creation of a new industry of arcade video games, video game arcades, and home video game consoles. The success of Pong not only solidified Atari's position in the video game industry but also led to the development of many other video games and systems.
            </Box>
          </Typography>
        </HistoryBox>
      </Stack>
    </MainContainer>
  );
};

export default Game;