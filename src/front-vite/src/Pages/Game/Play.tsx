import "./Game.css";
import { useUser } from "../../Providers/UserContext/User";
import { useState, useEffect, useRef } from "react";
import { X } from "@mui/icons-material";

const Play = () => {
    const { user, userSocket } = useUser();
    const [position, setPosition] = useState<boolean | null>(null);
    const [isJoined, setIsJoined] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState({
      player1: { y: 150, direction: 0 },
      player2: { y: 150, direction: 0 },
      ball: { x: 390, y: 190, dx: 2, dy: 2 },
      score: { player1: 0, player2: 0 },
      lastScored: null as "player1" | "player2" | null,
    });

    const joinQueue = () => {
      userSocket?.emit("joinQueue", user.id);
    };

    let playerSpeed = 5;
    const gameWidth = 800;
    const gameHeight = 500;
    const requestRef = useRef<number>();
    const lastFrameTime = useRef<number>(performance.now());
  
    useEffect(() => {
      if (!userSocket) {
        return;
      }
      userSocket.on("state", (state) => {
        setGameState(state);
      });
  
      userSocket.on("startGame", (position: boolean | null) => {
        setPosition(position);
      });
  
      userSocket.on("connect", () => {
        setIsConnected(true);
      });
  
      userSocket.on("disconnect", () => {
        setIsConnected(false);
      });
  
      userSocket.emit("getPosition", user.id, (position: boolean | null) => {
        console.log("position:", position);
        setPosition(position);
      });
      
      console.log("position old:", position);
  
      return () => {
        userSocket.off("state");
        userSocket.off("startGame");
        userSocket.off("connect");
        userSocket.off("disconnect");
      };
    }, [userSocket]);
  
    const resetBall = () => {
      return { x: gameWidth / 2, y: gameHeight / 2, dx: 0, dy: 0 };
    };
  
    const updateBallPosition = (deltaTime: number) => {
      setGameState((prevState) => {
        let { x, y, dx, dy } = prevState.ball;
        const { player1, player2 } = prevState;
  
        x += dx * deltaTime * 60; // 60 ile çarparak hızlandırma
        y += dy * deltaTime * 60; // 60 ile çarparak hızlandırma
  
        if (y <= 0) {
          dy = Math.abs(dy);
          y = 0;
        }
        else if(y >= gameHeight - 20) {
          dy = Math.abs(dy) * -1;
          y = gameHeight - 20;
        }  
  
        const paddleHit = (paddleY: number) => {
          const paddleCenter = paddleY + 50;
          const ballCenter = y + 10;
          const offset = ballCenter - paddleCenter;
          const normalizedOffset = offset / 50;
          return normalizedOffset * 5; // Adjust the multiplier for desired bounce angle
        };
  
        if (
          (x <= 20 && x + 20 >= 10 && y + 20 >= player1.y && y <= player1.y + 100) ||
          (x >= gameWidth - 40 && x <= gameWidth - 20 && y + 20 >= player2.y && y <= player2.y + 100)
        ) {
          dx = -dx;
          if (x <= 20) {
            dy = paddleHit(player1.y);
          } else {
            dy = paddleHit(player2.y);
          }
        }
  
        if (x <= 0) {
          return {
            ...prevState,
            score: { ...prevState.score, player2: prevState.score.player2 + 1 },
            ball: resetBall(),
          };
        } else if (x >= gameWidth - 20) {
          return {
            ...prevState,
            score: { ...prevState.score, player1: prevState.score.player1 + 1 },
            ball: resetBall(),
          };
        } else {
          return {
            ...prevState,
            ball: { x, y, dx, dy },
          };
        }
      });
    };
  
    const updatePlayerPosition = (deltaTime: number) => {
      const calculateNewY = (player: { y: number; direction: number; }) => 
        Math.max(0, Math.min(gameHeight - 100, player.y + player.direction * playerSpeed * deltaTime * 60));
    
      setGameState((prevState) => ({
        ...prevState,
        player1: { ...prevState.player1, y: calculateNewY(prevState.player1) },
        player2: { ...prevState.player2, y: calculateNewY(prevState.player2) },
      }));
    };
    
  
    const animate = (time: number) => {
      const deltaTime = (time - lastFrameTime.current) / 1000; // Geçen süreyi saniye cinsinden hesapla
      lastFrameTime.current = time;
  
      updateBallPosition(deltaTime);
      updatePlayerPosition(deltaTime);
      requestRef.current = requestAnimationFrame(animate);
    };
  
    useEffect(() => {
      requestRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(requestRef.current!);
    }, []);

    const emitMove = (direction: number) => {
      userSocket?.emit("move", direction);
    }
  
    const [isKeyPressed, setIsKeyPressed] = useState(false);
  
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key ===  "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
      } else {return};

      if (isKeyPressed === true) {return};

      if (e.key === "ArrowUp") {
        emitMove(-1);
      } else if (e.key === "ArrowDown") {
        emitMove(1);
      }
      setIsKeyPressed(true);
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (isKeyPressed === false) {return};

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        emitMove(0);
      } else {return};
      setIsKeyPressed(false);
    };
  
    useEffect(() => {
      if (position === null) {return};
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, [isKeyPressed, position]);
  
    return (
      <div className="container">
        <button onClick={joinQueue}>join</button>
        <div className="score">
          {gameState.score.player1} - {gameState.score.player2}
        </div>
        <div className="paddle" style={{ top: `${gameState.player1.y/500*100}%`, left: "1.25%" }} />
        <div className="paddle" style={{ top: `${gameState.player2.y/500*100}%`, right: "1.25%" }} />
        <div className="ball" style={{ top: `${gameState.ball.y/500*100}%`, left: `${gameState.ball.x/800*100}%` }} />
      </div>
    );
  };

export default Play;