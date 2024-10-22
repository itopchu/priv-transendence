import "./Game.css";
import { UserPublic, useUser } from "../../Providers/UserContext/User";
import { useState, useEffect } from "react";
import axios from "axios";
import { CustomScrollBox } from "../Channels/Components/Components";
import { sendGameInvite } from "../../Providers/ChatContext/utils";
import { useChat } from "../../Providers/ChatContext/Chat";
import { BACKEND_URL } from "../../Providers/UserContext/User";

enum PlayerStates {
  notInGame = 0,
  player1_left = 1,
  player2_right = 2,
  inQueue = 3,
  inGame = 4,
  Win = 5,
  Lose = 6,
}

const Play = () => {
  const { userSocket } = useUser();
  const { chatProps, changeChatProps } = useChat();
  const [playerState, setPlayerState] = useState<PlayerStates>(PlayerStates.notInGame);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mePaused, setMePaused] = useState(false);
  const [countDown, setCountDown] = useState(0);
  const [firstTime, setFirstTime] = useState(false);
  const [showInviteList, setShowInviteList] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<UserPublic[] | null>(null);
  const [gameState, setGameState] = useState({
    player1: { y: 150, direction: 0 },
    player2: { y: 150, direction: 0 },
    ball: { x: 390, y: 190, dx: 0, dy: 0 },
    score: { player1: 0, player2: 0 },
  });

    useEffect(() => {
      if (!userSocket) {
        return;
      }
      userSocket.on("state", (state) => {
        setGameState(state);
        setIsPlaying(true);
      });
      
      userSocket.on("startGame", (playerState: number) => {
        setPlayerState(playerState);
        setIsPlaying(true);
      });
      
      userSocket.on("isGamePlaying", (playing: boolean) => {
        setIsPlaying(playing);
        if (playing) {
          setCountDown(0);
        } else {
          setCountDown(10);
        }
      });
      
      userSocket.on("gameOver", (win: boolean) => {
        if (win) {
          setPlayerState(PlayerStates.Win);
        } else {
          setPlayerState(PlayerStates.Lose);
        }
        setIsPlaying(false);
      });

      userSocket.on("playerState", (playerState: number) => {
        setPlayerState(playerState);
      });
      
      userSocket.emit("getPlayerState", (playerState: number) => {
        setPlayerState(playerState);
      });
      
      return () => {
        userSocket.off("state");
        userSocket.off("startGame");
        userSocket.off("isGamePlaying");
        userSocket.off("playerState");
        userSocket.off("gameOver");
      };
    }, [userSocket]);

    useEffect(() => {
      return() => {
        if (isPlaying)
          userSocket?.emit("pauseGame");
      }
    }, [isPlaying]);

    useEffect(() => {
      if (countDown <= 0) return;
      const interval = setInterval(() => {
        setCountDown(countDown - 1);
      }, 1000);
      return () => clearInterval(interval);
    } , [countDown]);

    useEffect(() => {
      if (playerState !== PlayerStates.player1_left && playerState !== PlayerStates.player2_right) {
        setMePaused(false);
        setIsPlaying(false);
        setCountDown(0);
      }
    }, [playerState]);
    
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
      if (!isPlaying) return;
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, [isKeyPressed, isPlaying]);
    
    const joinQueue = () => {
      userSocket?.emit("joinQueue");
      setPlayerState(PlayerStates.inQueue);
    };
    
    const playWithBot = () => {
      userSocket?.emit("playWithBot");
      setPlayerState(PlayerStates.player1_left);
    };
    
    const pauseGame = () => {
      if (!isPlaying) return;
      setMePaused(true);
      userSocket?.emit("pauseGame");
    };
    
    const resumeGame = () => {
      if (!isPlaying && mePaused) {
        setCountDown(0);
        setMePaused(false);
        userSocket?.emit("resumeGame");
      }
    };
    
    const leave = () => {
      if (playerState === PlayerStates.inGame)
        setPlayerState(PlayerStates.notInGame);
      userSocket?.emit("leaveGame");
    };

    const leaveQueue = () => {
      userSocket?.emit("leaveQueue");
      setPlayerState(PlayerStates.notInGame);
    };

    const togglePlayPause = () => {
      if (isPlaying)
        pauseGame();
      else
        resumeGame();
    };

    const home = () => {
      setPlayerState(PlayerStates.notInGame);
    };

    const getOnlineUsers = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/user/getUsers/online`, {withCredentials: true});
        setOnlineUsers(res.data.publicUsers);
      } catch (err) {
        console.error(err);
      }
    };

    const invite = async () => {
      if (!showInviteList) {
        await getOnlineUsers();
      }
      setFirstTime(true);
      setShowInviteList(!showInviteList);
    };

    const invitePlayer = (id: number) => {
      if (userSocket)
        sendGameInvite(id, userSocket, chatProps, changeChatProps);
    };

    return (
      <div className="container">
        {(() => {
          switch (playerState) {
            case PlayerStates.inGame:
              return (
                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                  <h1>You are already in game...</h1>
                  <button className="retro-button" onClick={leave} style={{ position: "absolute", left: "50%", transform: "translate(-50%, -50%)" }}>Leave</button>
                </div>
              );
              case PlayerStates.notInGame:
                return (
                  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <button className="retro-button" onClick={joinQueue}>Join</button>
                    <button className="retro-button" onClick={playWithBot}>Play with Bot</button>
                    <button className="retro-button" onClick={invite}>Invite Player</button>
                    {firstTime && <div className={`custom-scrollbox ${showInviteList ? 'open' : 'close'}`}>
                      <CustomScrollBox style={{ maxHeight: '150px', overflowX: 'hidden' }}>
                        <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          {onlineUsers?.map(user => (
                            <li style={{ marginBottom: "10px" }} key={user.id}>
                              <button className="retro-button" style={{ border: "none" }} onClick={() => invitePlayer(user.id)}>{user.nameFirst}</button>
                            </li>
                          ))}
                        </ul>
                      </CustomScrollBox>
                    </div>
                    }
                  </div>
                );
            case PlayerStates.inQueue:
              return (
                <div className="loader-container" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                  <div className="loader"></div>
                  <button className="retro-button" onClick={leaveQueue} style={{ marginTop: "50px" }}>Cancel</button>
                </div>
              );
            case PlayerStates.Win:
              return (
                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                  <h1>You Win!</h1>
                  <button className="retro-button" onClick={home} style={{ position: "absolute", left: "%50"}}>OK</button>
                </div>
              );
            case PlayerStates.Lose:
              return (
                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                  <h1>You Lose!</h1>
                  <button className="retro-button" onClick={home} style={{ position: "absolute", left: "%50"}}>OK</button>
                </div>
              );
            default:
              return (
                <div>
                  <button className="exit" name="Leave Game" onClick={leave} style={{ position: "absolute", left: "10px", top: "10px" }}></button>
                  <button className="play-pause-button" onClick={togglePlayPause} style={{ position: "absolute", left: "40px", top: "10px" }}>
                    <div className={isPlaying ? "pause-icon" : "play-icon"}></div>
                  </button>
                  <h1 className="score">
                    {gameState.score.player1} - {gameState.score.player2}
                  </h1>
                  {countDown > 0 && (
                    <h1 className="countdown" style={{ position: "absolute", top: "30px", [playerState === PlayerStates.player1_left ? (mePaused ? "left" : "right") : (mePaused ? "right" : "left")]: "100px" }}>
                      {countDown}
                    </h1>
                  )}
                  <div className="paddle" style={{ top: `${gameState.player1.y / 500 * 100}%`, left: "1.25%" }} />
                  <div className="paddle" style={{ top: `${gameState.player2.y / 500 * 100}%`, right: "1.25%" }} />
                  <div className="ball" style={{ top: `${gameState.ball.y / 500 * 100}%`, left: `${gameState.ball.x / 800 * 100}%` }} />
                </div>
              );
          }
        })()}
      </div>
    );
}
  export default Play;