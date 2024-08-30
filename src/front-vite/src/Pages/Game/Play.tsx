import "./Game.css";
import { useUser } from "../../Providers/UserContext/User";
import { useState, useEffect } from "react";

enum PlayerStates {
  notInGame = 0,
  player1_left = 1,
  player2_right = 2,
  inQueue = 3,
}

const Play = () => {
    const { user, userSocket } = useUser();
    const [playerState, setPlayerState] = useState<PlayerStates>(PlayerStates.notInGame);
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

    
    useEffect(() => {
      if (!userSocket) {
        return;
      }
      userSocket.on("state", (state) => {
        setGameState(state);
      });
      
      userSocket.on("startGame", (playerState: number) => {
        setPlayerState(playerState);
      });
      
      userSocket.on("connect", () => {
        setIsConnected(true);
      });
      
      userSocket.on("disconnect", () => {
        setIsConnected(false);
      });

      userSocket.on("gameOver", (win: boolean) => {
        if (win) {
          alert("You win!");
        } else {
          alert("You lose!");
        }
        setPlayerState(PlayerStates.notInGame);
      });
      
      userSocket.emit("getPlayerState", (playerState: number) => {
        console.log("playerState:", playerState);
        setPlayerState(playerState);
      });
      
      console.log("position old:", playerState);
      
      return () => {
        userSocket.off("state");
        userSocket.off("startGame");
        userSocket.off("connect");
        userSocket.off("disconnect");
        userSocket.off("gameOver");
        pasueGame();
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
      if (playerState === PlayerStates.notInGame || playerState === PlayerStates.inQueue) return;
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, [isKeyPressed, playerState]);
    
    const joinQueue = () => {
      userSocket?.emit("joinQueue");
      setPlayerState(PlayerStates.inQueue);
    };

    const playWithBot = () => {
      userSocket?.emit("playWithBot");
      setPlayerState(PlayerStates.player1_left);
    };

    const pasueGame = () => {
      userSocket?.emit("pauseGame");
    };

    const resumeGame = () => {
      if ( playerState === PlayerStates.player1_left || playerState === PlayerStates.player2_right)
        userSocket?.emit("resumeGame");
    };

    const leave = () => {
      userSocket?.emit("leaveGame");
      console.log("leave");
      setPlayerState(PlayerStates.notInGame);
    };

    const Loader = () => {
      return (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      );
    }; 
    
    return (
      <div className="container">
        {playerState === PlayerStates.notInGame ? (
          <div style={{position: "absolute", left:"50%", top:"50%", transform: "translate(-50%, -50%)"}}>
          <button onClick={joinQueue}>Join</button>
          <button onClick = {playWithBot}>Play with Bot</button>
        </div>) : playerState === PlayerStates.inQueue ? (
          <Loader />
        ) : (
          <div>
          <button onClick={leave}>leave</button>
          <button onClick={pasueGame}>pause</button>
          <button onClick={resumeGame}>resume</button>
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