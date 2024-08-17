import React, { ReactElement, useEffect, useState } from "react";
import {
  Container,
  Stack,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { styled } from "@mui/system";
import { useUser } from "../../Providers/UserContext/User";

const GameBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  width: "100%",
  paddingTop: "56.25%",
  position: "relative",
}));

const HistoryBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  borderRadius: "1em",
}));

const MainContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.primary.dark,
}));

const Game: React.FC = () => {
  const theme = useTheme();
  const { user, setUser, userSocket } = useUser();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [gameState, setGameState] = useState({
    player1: { y: 150 },
    player2: { y: 150 },
    ball: { x: 390, y: 190 },
    score: { player1: 0, player2: 0 },
  });
  const [buttonText, setButtonText] = useState("disconnect");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userSocket) {
      return;
    }
    userSocket.on("state", (state) => {
      setGameState(state);
    });

    userSocket.on("startGame", (roomId) => {
      setRoomId(roomId);
    });

    userSocket.on("connect", () => {
      setIsConnected(true);
    });

    userSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    userSocket.emit("getRoomId", user.id, (roomId: string | null) => {
      console.log("roomId", roomId);
      setRoomId(roomId);
    });
    
    console.log(roomId);

    return () => {
      userSocket.off("state");
      userSocket.off("startGame");
      userSocket.off("connect");
      userSocket.off("disconnect");
    };
  }, [userSocket]);

  const handleConnection = () => {
    if (buttonText === "connect") {
      userSocket?.connect();
      setButtonText("disconnect");
    } else if (buttonText === "disconnect") {
      userSocket?.disconnect();
      setButtonText("connect");
    }
  };

  const Play = () => {
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!roomId) return;
      const y: number = e.pageY - 300;
      userSocket?.emit("move", { userId: user.id, roomId, y });
    };

    const joinRoom = () => {
      userSocket?.emit("joinQueue", user.id);
    };

    if (!roomId) {
      return (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <button onClick={handleConnection}>{buttonText}</button>
          <h1>Enter Queue</h1>
          <button onClick={joinRoom}>Odaya Katil</button>
        </div>
      );
    }

    return (
      <div
        onMouseMove={handleMouseMove}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          border: "3px solid black",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "10px",
            top: `${gameState.player1.y}px`,
            width: "1%",
            height: "10%",
            backgroundColor: "blue",
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            right: "10px",
            top: `${gameState.player2.y}px`,
            width: "10px",
            height: "100px",
            backgroundColor: "red",
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            left: `${gameState.ball.x}px`,
            top: `${gameState.ball.y}px`,
            width: "10px",
            height: "10px",
            backgroundColor: "green",
            borderRadius: "50%",
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          Score: {gameState.score.player1} - {gameState.score.player2}
        </div>
      </div>
    );
  };

  const getInfo = () => {
    userSocket?.emit("info");
  };

  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));
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
              textAlign: "center",
            }}
          >
            Pong Game
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: theme.palette.primary.main,
            padding: theme.spacing(2),
            borderRadius: theme.shape.borderRadius,
          }}
        >
          <button
            onClick={getInfo}
            style={{ fontSize: "24px" }}
          >
            info
          </button>
        </Box>
        <GameBox>
          <Play />
        </GameBox>
        <HistoryBox>
          <Typography
            variant="h4"
            sx={{
              paddingTop: "0.2em",
              textAlign: "center",
              width: "11ch",
              color: theme.palette.secondary.main,
              bgcolor: theme.palette.primary.main,
              borderTopLeftRadius: "0.5em",
              borderTopRightRadius: "0.5em",
            }}
          >
            Pong (1972)
          </Typography>
          <Box
            bgcolor={theme.palette.primary.main}
            sx={{
              marginBottom: "1em",
              padding: "0.5em",
              textAlign: "justify",
              color: theme.palette.secondary.main,
              borderBottomLeftRadius: "1em",
              borderBottomRightRadius: "1em",
              borderTopRightRadius: "1em",
            }}
          >
            <Typography
              padding={"1em"}
              borderRadius={"1em"}
              variant="body2"
              bgcolor={theme.palette.background.default}
            >
              Pong is one of the earliest arcade video games and the first
              sports arcade video game. It is a table tennis sports game
              featuring simple two-dimensional graphics. The game was originally
              manufactured by Atari, which released it in 1972. Allan Alcorn
              created Pong as a training exercise assigned to him by Atari
              co-founder Nolan Bushnell. Bushnell based the idea on an
              electronic ping-pong game included in the Magnavox Odyssey, which
              later resulted in a lawsuit against Atari.
            </Typography>
          </Box>
          <Typography
            variant="h5"
            sx={{
              paddingTop: "0.2em",
              textAlign: "center",
              width: "9ch",
              color: theme.palette.secondary.main,
              bgcolor: theme.palette.primary.main,
              borderTopLeftRadius: "0.5em",
              borderTopRightRadius: "0.5em",
            }}
          >
            Gameplay
          </Typography>
          <Stack
            bgcolor={theme.palette.background.default}
            color={theme.palette.primary.main}
            border={10}
            padding={"1em"}
            direction={isSmallScreen ? "column" : "row"}
            spacing={2}
            sx={{
              marginBottom: "1em",
              padding: "0.5em",
              borderTopLeftRadius: "0em",
              borderBottomLeftRadius: "1em",
              borderBottomRightRadius: "1em",
              borderTopRightRadius: "1em",
            }}
          >
            <Typography
              padding={"1em"}
              textAlign={"justify"}
              variant="body2"
              borderRadius={"1em"}
              color={theme.palette.secondary.main}
            >
              Pong is a two-player game that simulates table tennis. Players
              control the paddles to hit the ball back and forth. The goal is to
              defeat the opponent by being the first one to gain a high score.
              The paddles move vertically along the left or right side of the
              screen. Players use the paddles to hit the ball back and forth.
              The game can be played with two human players, or one player
              against a computer controlled paddle.
            </Typography>
            <Box
              component="img"
              src="https://upload.wikimedia.org/wikipedia/commons/6/62/Pong_Game_Test2.gif"
              alt="Pong Gameplay"
              width={isSmallScreen ? "100%" : "auto"}
              height={"auto"}
              borderRadius={"1em"}
            />
          </Stack>
          <Typography
            variant="h5"
            sx={{
              paddingTop: "0.2em",
              textAlign: "center",
              width: "12ch",
              color: theme.palette.secondary.main,
              bgcolor: theme.palette.primary.main,
              borderTopLeftRadius: "0.5em",
              borderTopRightRadius: "0.5em",
            }}
          >
            Development
          </Typography>
          <Box
            bgcolor={theme.palette.primary.main}
            sx={{
              marginBottom: "1em",
              padding: "0.5em",
              textAlign: "justify",
              color: theme.palette.secondary.main,
              borderBottomLeftRadius: "1em",
              borderBottomRightRadius: "1em",
              borderTopRightRadius: "1em",
            }}
          >
            <Typography
              padding={"1em"}
              borderRadius={"1em"}
              variant="body2"
              bgcolor={theme.palette.background.default}
            >
              The development of Pong was significant as it was one of the first
              video games to gain widespread popularity in both arcade and Game
              console formats. It led to the creation of a new industry of
              arcade video games, video game arcades, and home video game
              consoles. The success of Pong not only solidified Atari's position
              in the video game industry but also led to the development of many
              other video games and systems.
            </Typography>
          </Box>
        </HistoryBox>
      </Stack>
    </MainContainer>
  );
};

export default Game;
