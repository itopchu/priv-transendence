import React, { useState } from "react";
import { MenuDrawer } from "./Navigation/Menu/MenuDrawer";
import { Box, IconButton, Stack, InputBase } from "@mui/material";
import { UserPublic, useUser } from "../../Providers/UserContext/User";
import { AccountCircle, WidthFull } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { alpha, darken, useTheme } from "@mui/material/styles";
import axios from "axios";

const BACKEND_URL: string =
  import.meta.env.ORIGIN_URL_BACK || "http://localhost.codam.nl:4000";

export const HeaderBar: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchValue, setSearchValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [users, setUsers] = useState([]);

  const userRow = (userInfo: UserPublic) => {
    return (
      <Stack
        direction={"row"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          navigate(`/profile/${userInfo.id}`);
        }}
        alignItems={"center"}
        spacing={1.3}
        bgcolor={theme.palette.primary.main}
        padding={"0.3em"}
        paddingX={"0.5em"}
        borderRadius={"0.5em"}
        sx={{
          "&:hover": {
            cursor: "pointer",
            borderRadius: "1em",
            backgroundColor: theme.palette.primary.light,
          },
        }}
      >
        <Box
          justifyContent={"center"}
          sx={{
            width: "2em",
            height: "2em",
            borderRadius: "50%",
            overflow: "hidden",
            "& img, & .MuiSvgIcon-root": {
              width: "100%",
              height: "100%",
              objectFit: "cover",
            },
          }}
        >
          {userInfo.image ? (
            <img src={userInfo.image} alt="User profile" />
          ) : (
            <AccountCircle color="secondary" />
          )}
        </Box>
        <Stack direction={"row"} spacing={0.5}>
          <Box>{userInfo.nameFirst}</Box>
          <Box>{userInfo.nameLast}</Box>
        </Stack>
      </Stack>
    );
  };

  const askUsers = async (search: string) => {
    console.log("searching for:", search);
    if (!search) {
      setUsers([]);
      return;
    }
    try {
      const response = await axios.get(BACKEND_URL + `/user/search/${search}`, {
        withCredentials: true,
      });
      if (response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setSearchValue(newValue);
    askUsers(newValue);
  };

  return (
    <Stack
      bgcolor={theme.palette.primary.dark}
      justifyContent={"space-between"}
      alignContent={"center"}
      alignItems={"center"}
      position={"fixed"}
      paddingY={"0.3em"}
      paddingX={"0.3em"}
      direction={"row"}
      width={"100%"}
      height={"3em"}
      zIndex={"50"}
      borderBottom={1}
      borderColor={theme.palette.divider}
    >
      <Stack direction={"row"} spacing={1} alignItems={"center"}>
        <MenuDrawer />
        <Box style={{ position: "relative" }}>
          <InputBase
            placeholder="Search a name..."
            value={searchValue}
            onChange={handleInputChange}
            onFocus={() => {
              setIsFocused(true);
            }}
            onBlur={() => {
              setIsFocused(false);
            }}
            sx={{
              height: "2em",
              borderRadius: "0.5em",
              padding: "0.2em 0.5em",
              color: theme.palette.secondary.main,
              backgroundColor: theme.palette.primary.main,
              "&.Mui-focused": {
                backgroundColor: theme.palette.primary.light,
                color: theme.palette.text.primary,
              },
            }}
          />
          {isFocused && users.length !== 0 && (
            <Stack
              style={{
                position: "absolute",
                borderRadius: "0.5em",
                top: "100%",
                left: 0,
                width: "200px",
                backgroundColor: theme.palette.primary.dark,
                boxShadow: theme.shadows[3],
                padding: "0.3em",
                zIndex: 100,
              }}
              spacing={0.5}
              onMouseDown={(e) => e.preventDefault()}
            >
              {users.map((user: UserPublic) => (
                <div key={user.id}>{userRow(user)}</div>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
      <IconButton
        onClick={() => {
          navigate(`/profile/${user.id}`);
        }}
        sx={{
          overflow: "hidden",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          height: "100%",
          aspectRatio: "1/1",
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.4)",
          "& img, & svg": {
            position: "absolute",
            height: "100%",
            width: "100%",
            objectFit: "cover",
            transition: "transform 0.3s ease-in-out",
          },
          "&:hover img, &:hover svg": {
            transform: "scale(1.3)",
          },
        }}
      >
        {user && user.image ? (
          <img
            src={user.image}
            alt="User profile"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <AccountCircle
            color="secondary"
            sx={{
              fontSize: "inherit",
              width: "100%",
              height: "100%",
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.4)",
            }}
          />
        )}
      </IconButton>
    </Stack>
  );
};

export default HeaderBar;
