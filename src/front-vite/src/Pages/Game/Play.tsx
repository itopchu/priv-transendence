import "./Game.css";
import { useUser } from "../../Providers/UserContext/User";
import { useState, useEffect } from "react";

const Play = () => {
    const { user, userSocket } = useUser();
    const [position, setPosition] = useState<boolean | null>(null);
    const [isJoined, setIsJoined] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState({
      player1: { y: 150, direction: 0 },
      player2: { y: 150, direction: 0 },
      ball: { x: 390, y: 190, dx: 0, dy: 0 },
      bot: false,
      score: { player1: 0, player2: 0 },
      lastScored: null as "player1" | "player2" | null,
    });

    const joinQueue = () => {
      userSocket?.emit("joinQueue", user.id);
    };
  
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
  
      userSocket.emit("getPosition", (position: boolean | null) => {
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

    const emitMove = (direction: number) => {
      userSocket?.emit("move", direction);
    }
  
    const [isKeyPressed, setIsKeyPressed] = useState(false);
  
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key ===  "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
      } else return;

      if (isKeyPressed === true) {return};

      if (e.key === "ArrowUp") {
        emitMove(-1);
      } else if (e.key === "ArrowDown") {
        emitMove(1);
      }
      setIsKeyPressed(true);
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (isKeyPressed === false) return;

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        emitMove(0);
      } else return;
      setIsKeyPressed(false);
    };
  
    useEffect(() => {
      if (position === null) return;
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, [isKeyPressed, position]);

    const leave = () => {
      userSocket?.emit("leaveGame");
      console.log("leave");
      setPosition(null);
    };

    return (
      <div className="container">
        {position === null ? (
        <div style={{position: "absolute", left:"50%", top:"50%", transform: "translate(-50%, -50%)"}}>
          <button onClick={joinQueue}>Join</button>
        </div>) : (
        <div>
          <button onClick={leave}>leave</button>
          <h1 className="score">
            {gameState.score.player1} - {gameState.score.player2}
          </h1>
          <div className="paddle" style={{ top: `${gameState.player1.y/500*100}%`, left: "1.25%" }} />
          <div className="paddle" style={{ top: `${gameState.player2.y/500*100}%`, right: "1.25%" }} />
          <div className="ball" style={{ top: `${gameState.ball.y/500*100}%`, left: `${gameState.ball.x/800*100}%` }} />
        </div>
        )}
      </div>
    );
  };

export default Play;