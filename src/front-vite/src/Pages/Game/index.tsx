/* import React, { ReactElement, useEffect, useState } from "react";
import {
  Container,
  Stack,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { styled } from "@mui/system";
import { useUser } from "../../Providers/UserContext/User"; */

/* const GameBox = styled(Box)(({ theme }) => ({
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

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault(); // Varsayılan davranışı durdur
          const y = e.key === "ArrowUp" ? -10 : 10;
          userSocket?.emit("move", { userId: user.id, roomId, y });
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
     }, [])

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

    const ballLeft = (gameState.ball.x / 1920) * 100;
    const ballTop = (gameState.ball.y / 1080) * 100;
    const paddleMe = (gameState.player1.y / 1080) * 100;
    const paddleEnemy = (gameState.player2.y / 1080) * 100;
    return (
      <div
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
            left: "3%",
            top: `${paddleMe}%`,
            width: "1%",
            height: "10%",
            backgroundColor: "blue",
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            right: "3%",
            top: `${paddleEnemy}%`,
            width: "1%",
            height: "10%",
            backgroundColor: "red",
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            left: `${ballLeft}%`,
            top: `${ballTop}%`,
            width: "1%",
            height: "1.8%",
            backgroundColor: "orange",
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

  const stopGame = () => {
    userSocket?.emit("stopGame", roomId);
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
 */

import React, { useState, useEffect, useRef } from "react";
import "./Game.css";

const Game: React.FC = () => {
  const [gameState, setGameState] = useState({
    player1: { y: 150 },
    player2: { y: 150 },
    ball: { x: 390, y: 190, dx: 2, dy: 2 },
    score: { player1: 0, player2: 0 },
    lastScored: null as "player1" | "player2" | null,
  });

  const [fps, setFps] = useState<number>(0);
  const requestRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const player1Direction = useRef<number>(0);
  const player2Direction = useRef<number>(0);
  const lastFrameTime = useRef<number>(performance.now());
  const frameCount = useRef<number>(0);

  const getRandomAngle = () => {
    const angle = Math.random() * Math.PI / 4 - Math.PI / 8; // Random angle between -22.5 and 22.5 degrees
    return angle;
  };

  const resetBall = (lastScored: "player1" | "player2" | null) => {
    const angle = getRandomAngle();
    const speed = 2;
    const dx = lastScored === "player1" ? -speed * Math.cos(angle) : speed * Math.cos(angle);
    const dy = speed * Math.sin(angle);
    return {
      x: containerRef.current!.clientWidth / 2,
      y: containerRef.current!.clientHeight / 2,
      dx,
      dy,
    };
  };

  const updateBallPosition = () => {
    setGameState((prevState) => {
      let { x, y, dx, dy } = prevState.ball;
      const { player1, player2 } = prevState;

      x += dx;
      y += dy;

      if (y <= 0 || y >= containerRef.current!.clientHeight - 20) dy = -dy;

      const paddleHit = (paddleY: number) => {
        const paddleCenter = paddleY + 50;
        const ballCenter = y + 10;
        const offset = ballCenter - paddleCenter;
        const normalizedOffset = offset / 50;
        return normalizedOffset * 5; // Adjust the multiplier for desired bounce angle
      };

      if (
        (x <= 30 && x + 20 >= 10 && y + 20 >= player1.y && y <= player1.y + 100) ||
        (x >= containerRef.current!.clientWidth - 50 && x <= containerRef.current!.clientWidth - 30 && y + 20 >= player2.y && y <= player2.y + 100)
      ) {
        dx = -dx;
        if (x <= 30) {
          dy = paddleHit(player1.y);
        } else {
          dy = paddleHit(player2.y);
        }
      }

      if (x <= 0) {
        return {
          ...prevState,
          score: { ...prevState.score, player2: prevState.score.player2 + 1 },
          ball: resetBall("player2"),
          lastScored: "player2",
        };
      } else if (x >= containerRef.current!.clientWidth - 20) {
        return {
          ...prevState,
          score: { ...prevState.score, player1: prevState.score.player1 + 1 },
          ball: resetBall("player1"),
          lastScored: "player1",
        };
      } else {
        return {
          ...prevState,
          ball: { x, y, dx, dy },
        };
      }
    });
  };

  const updatePlayerPosition = () => {
    setGameState((prevState) => {
      const newPlayer1Y = prevState.player1.y + player1Direction.current * 5;
      const newPlayer2Y = prevState.player2.y + player2Direction.current * 5;
      return {
        ...prevState,
        player1: { y: Math.max(0, Math.min(containerRef.current!.clientHeight - 100, newPlayer1Y)) },
        player2: { y: Math.max(0, Math.min(containerRef.current!.clientHeight - 100, newPlayer2Y)) },
      };
    });
  };

  const animate = (time: number) => {
    updateBallPosition();
    updatePlayerPosition();
    requestRef.current = requestAnimationFrame(animate);

    // FPS hesaplama
    frameCount.current++;
    const delta = time - lastFrameTime.current;
    if (delta >= 1000) {
      setFps((frameCount.current / delta) * 1000);
      frameCount.current = 0;
      lastFrameTime.current = time;
    }
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "o") {
      player1Direction.current = -1;
    } else if (e.key === "l") {
      player1Direction.current = 1;
    } else if (e.key === "w" || e.key === "W") {
      player2Direction.current = -1;
    } else if (e.key === "s" || e.key === "S") {
      player2Direction.current = 1;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === "o" || e.key === "l") {
      player1Direction.current = 0;
    } else if (e.key === "w" || e.key === "W" || e.key === "s" || e.key === "S") {
      player2Direction.current = 0;
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <div className="container" ref={containerRef}>
      <div className="score">
        {gameState.score.player1} - {gameState.score.player2}
      </div>
      <div className="fps">FPS: {fps.toFixed(2)}</div>
      <div className="paddle" style={{ top: `${gameState.player1.y}px`, left: "10px" }} />
      <div className="paddle" style={{ top: `${gameState.player2.y}px`, right: "10px" }} />
      <div className="ball" style={{ top: `${gameState.ball.y}px`, left: `${gameState.ball.x}px` }} />
    </div>
  );
};

export default Game;