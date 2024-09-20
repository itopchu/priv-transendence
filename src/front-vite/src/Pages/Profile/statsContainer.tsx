import React, { useEffect, useState } from "react";
import { UserPublic } from "../../Providers/UserContext/User";
import {
  Avatar,
  Stack,
  Divider,
  Typography,
  useTheme,
  Box,
} from "@mui/material";
import { EmojiEvents as Cup } from "@mui/icons-material";
import { useMediaQuery } from "@mui/material";
import axios from "axios";

interface StatsContainerProps {
  visitedUser: UserPublic;
}

interface GameHistory {
  id: number;
  player1Score: number;
  player2Score: number;
  winner: boolean;
  player1: UserPublic;
  player2: UserPublic;
}

const BACKEND_URL: string =
  import.meta.env.ORIGIN_URL_BACK || "http://localhost:4000";

export const StatsContainer: React.FC<StatsContainerProps> = ({
  visitedUser,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));
  const [games, setGames] = useState<GameHistory[]>([]);

  useEffect(() => {
    const getGames = async () => {
      try {
        const response = await axios.get(
          `${BACKEND_URL}/user/games/${visitedUser.id}`,
          { withCredentials: true }
        );
        console.log("Response.data:", response.data);
        if (response.data.gamesDTO) {
          setGames(response.data.gamesDTO);
        }
      } catch (error) {
        setGames([]);
        console.error("Error getGames:", error);
      }
    };
    getGames();
  }, [visitedUser]);

  let gameLine = (game: GameHistory) => {
    const isPlayer1 = visitedUser.id === game.player1.id;
    const winner = game.winner ? isPlayer1 : !isPlayer1;
    const opponent = isPlayer1 ? game.player2 : game.player1;
    const ownScore = isPlayer1 ? game.player1Score : game.player2Score;
    const opponentScore = isPlayer1 ? game.player2Score : game.player1Score;
    return (
      <Stack
        direction={"row"}
        gap={1}
        justifyContent={isSmallScreen ? "center" : "space-between"}
        textAlign={"center"}
        bgcolor={theme.palette.primary.dark}
        borderRadius={"2em"}
        paddingY={"0.3em"}
        paddingX={isSmallScreen ? "1em" : "5em"}
        alignItems={"center"}
      >
        <Box
          bgcolor={
            winner ? theme.palette.success.light : theme.palette.error.light
          }
          borderRadius={"8px"}
          textAlign={"center"}
          alignContent={"center"}
          padding={"0.3em"}
          width={isSmallScreen ? "auto" : "10ch"}
          marginBottom={isSmallScreen ? "0.5em" : "0"}
        >
          <Typography alignContent={"center"} textAlign={"center"}>
            {winner ? "Victory" : "Defeat"}
          </Typography>
        </Box>
        <Stack
          direction={"row"}
          alignContent={"center"}
          alignItems={"center"}
          marginBottom={isSmallScreen ? "0.5em" : "0"}
        >
          {winner && (
            <Cup
              sx={{ color: theme.palette.secondary.main, marginRight: "0.5em" }}
            />
          )}
          <Typography alignContent={"center"} textAlign={"center"}>
            {"Score: " + ownScore + " - " + opponentScore}
          </Typography>
        </Stack>
        <Stack direction={"row"} gap={"1em"} alignItems={"center"}>
          <Avatar src={opponent.image} />
          <Typography alignContent={"center"} textAlign={"center"}>
            {opponent.nameNick
              ? opponent.nameNick
              : opponent.nameFirst + " " + opponent.nameLast}
          </Typography>
        </Stack>
      </Stack>
    );
  };

  let gameHistory = () => {
    return (
      <Stack
        sx={{
          overflowY: "scroll",
          scrollbarWidth: "none", // For Firefox
          msOverflowStyle: "none", // For IE and Edge
          "&::-webkit-scrollbar": {
            display: "none", // For Chrome, Safari, Opera
          },
        }}
        gap={1}
        padding={"0.5em"}
        direction="column"
        width={"100%"}
        height={"100%"}
        bgcolor={theme.palette.primary.main}
      >
        {games.map((game, index) => (
          <React.Fragment key={index}>{gameLine(game)}</React.Fragment>
        ))}
      </Stack>
    );
  };

  let gameStats = () => {
    const totalGames = games.length;
    const totalWins = games.reduce((acc, game) => {
      if ((game.winner === true && game.player1.id === visitedUser.id) || 
          (game.winner === false && game.player2.id === visitedUser.id)) {
        return acc + 1;
      }
      return acc;
    }, 0);

    const winPercentage = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

    return (
      <Stack
        direction={"row"}
        width={"100%"}
        borderBottom={1}
        borderColor={theme.palette.divider}
        padding={"0.3em"}
        justifyContent={"space-around"}
        divider={<Divider orientation="vertical" />}
        flex={1}
      >
          <Stack
            direction={"row"}
            flex={1}
            gap={"0.3em"}
            alignItems="center"
            justifyContent="center"
            overflow={"hidden"}
            height={"2em"}
          >
            <Typography variant="body2">{`Average victory in games played`}</Typography>
            <Cup sx={{ color: (theme) => theme.palette.secondary.main }} />
            <Typography variant="body2">{`${winPercentage.toFixed(2)}%`}</Typography>
          </Stack>
      </Stack>
    );
  };

  return (
    <Stack
      width={"100%"}
      maxHeight={isSmallScreen ? "80vh" : "80vh"}
      overflow={"hidden"}
    >
      {gameStats()}
      {gameHistory()}
    </Stack>
  );
};
export default StatsContainer;
