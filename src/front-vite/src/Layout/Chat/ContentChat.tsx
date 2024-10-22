import { ChatStatus, IChat, Message } from "./InterfaceChat";
import {
  Box,
  Stack,
  IconButton,
  InputBase,
  Button,
  Typography,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
	Send as SendIcon,
	Cancel as CancelIcon,
	KeyboardBackspace as BackIcon,
	VideogameAsset as GameIcon,
} from '@mui/icons-material';
import { ButtonAvatar, ClickTypography, LoadingBox } from '../../Pages/Channels/Components/Components';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { UserPublic, useUser } from '../../Providers/UserContext/User';
import { useChat } from '../../Providers/ChatContext/Chat';
import { formatErrorMessage, getFullname, getUsername, trimMessage } from '../../Pages/Channels/utils';
import { getStatusColor } from '../../Pages/Profile/ownerInfo';
import axios from 'axios';
import { DataUpdateType } from '../../Providers/ChannelContext/Types';
import { updatePropMap } from '../../Providers/ChannelContext/utils';
import { StatusTypography } from '../../Pages/Channels/Components/ChatBoxComponents';
import { sendGameInvite } from "../../Providers/ChatContext/utils";
import { visitedUserId } from "../../Pages/Profile/index";
import MessagesBox from "../../Pages/Channels/MessagesBox";
import { BACKEND_URL } from "../../Providers/UserContext/User";

const ContentChat = () => {
  const { chatProps, changeChatProps } = useChat();
  const { userSocket } = useUser();
	const theme = useTheme();

	const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<UserPublic | undefined>(chatProps.selected?.user);
  const [messageLog, setMessageLog] = useState<Map<number, Message>>(new Map());

	const messagesArray = useMemo(() => Array.from(messageLog.values()), [messageLog]);
  const isDisabled = chatProps.loading;

  useEffect(() => {
    const element = messagesEndRef.current;

    if (element) {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messageLog]);

  useEffect(() => {
    if (!chatProps.selected) return;
    changeChatProps({ loading: true });

    const controller = new AbortController();
    const getMessages = async () => {
      if (!chatProps.selected) return;

      try {
        const response = await axios.get(
          `${BACKEND_URL}/chat/messages/${chatProps.selected.id}`,
          {
            withCredentials: true,
            signal: controller.signal,
          }
        );
        if (response.data.messages) {
          const messages: Message[] = response.data.messages.sort(
            (a: Message, b: Message) => a.id - b.id
          );
          const msgMap = messages.reduce((acc, msg) => {
            acc.set(msg.id, msg);
            return acc;
          }, new Map<number, Message>());
          setMessageLog(msgMap);
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          setErrorMessage(formatErrorMessage(error, "Failed to get messages:"));
        }
      }
      changeChatProps({ loading: false });
    };

    getMessages();
    return () => {
      controller.abort();
      changeChatProps({ loading: true });
      setMessageLog(new Map());
    };
  }, [chatProps.selected?.id]);

  useEffect(() => {
    function onProfileStatus(updatedUser: UserPublic) {
      if (updatedUser.id === chatProps.selected?.user.id) {
        setUser(updatedUser);
      }
    }

    function handleMessageUpdate(data: DataUpdateType<Message>) {
      if (data.id === chatProps.selected?.id) {
        setMessageLog((prevMap) => updatePropMap(prevMap, data));
				if (errorMessage) {
					setErrorMessage(undefined);
				}
      }
    }

    function handleMessageError(message: string) {
      setErrorMessage(message);
    }

    userSocket?.on("profileStatus", onProfileStatus);
    userSocket?.on("chatMessageUpdate", handleMessageUpdate);
    userSocket?.on("chatMessageError", handleMessageError);
    userSocket?.emit("profileStatus", chatProps.selected?.user.id);

    return () => {
			if (visitedUserId !== chatProps.selected?.user.id)
				userSocket?.emit("unsubscribeProfileStatus", chatProps.selected?.user.id);
      userSocket?.off("chatMessageError", handleMessageError);
      userSocket?.off("chatMessageUpdate", handleMessageUpdate);
      userSocket?.off("profileStatus", onProfileStatus);
    };
  }, [chatProps.selected?.id, userSocket]);

  const toggleChatStatus = (
    status: ChatStatus,
    selection: IChat | undefined
  ) => {
    changeChatProps({ chatStatus: status, selected: selection });
  };

	const handleGameInvite = () => {
		navigate(`/game`);
    sendGameInvite(
			chatProps.selected?.user.id,
			userSocket,
			chatProps,
			changeChatProps,
			setErrorMessage
		);
	}

  const handleSend = () => {
    if (!inputRef.current) return;

    const cleanMessage = trimMessage(inputRef.current.value);
    if (cleanMessage.length) {
      const payload = {
        receiverId: chatProps.selected?.user.id,
        content: cleanMessage,
      };
      userSocket?.emit("sendChatMessage", payload);
    }
    inputRef.current.value = "";
  };

  return (
    <Box
      sx={{
        position: "fixed",
        border: "1px solid #abc",
        bottom: 16,
        right: 16,
        width: isSmallScreen ? "40ch" : "50ch",
        bgcolor: (theme) => theme.palette.primary.dark,
        borderRadius: "1em",
        maxHeight: "70vh",
        minHeight: "30vh",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        zIndex: 4,
      }}
    >
      <Stack direction={"column"} sx={{ flexGrow: 1, maxHeight: "100%" }}>
        <Stack
          direction={"row"}
          spacing={1.4}
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            borderTopLeftRadius: "1em",
            borderTopRightRadius: "1em",
            color: theme.palette.secondary.main,
            justifyContent: "flex-start",
            alignItems: "center",
            bgcolor: theme.palette.primary.dark,
            height: "48px",
          }}
        >
					<IconButton
						onClick={() => {
							toggleChatStatus(ChatStatus.Drawer, undefined)
						}}
						sx={{
							width: '40px',
							height: '40px',
							color: (theme) => theme.palette.secondary.main,
						}}
					>
						<BackIcon sx={{ fontSize: '120%' }} />
					</IconButton>
					<ButtonAvatar
						clickEvent={() => (navigate(`/profile/${user?.id}`))}
						src={user?.image}
						avatarSx={{
							border: `2px solid ${getStatusColor(user?.status, theme)}`,
						}}
					/>
					<Stack spacing={-1} >
						<ClickTypography
							noWrap
							color={theme.palette.text.primary}
							onClick={() => (navigate(`/profile/${user?.id}`))}
							sx={{
								overflow: 'hidden',
								textOverflow: 'ellipsis'
							}}
						>
							{getUsername(user)}
						</ClickTypography>
						<Typography
							variant='caption'
							color={'textSecondary'}
							onClick={() => (navigate(`/profile/${user?.id}`))}
							sx={{
								cursor: 'default',
								overflow: 'hidden',
								textOverflow: 'ellipsis'
							}}
						>
							{getFullname(user)}
						</Typography>
					</Stack>
          <Box flexGrow={1} />
						<IconButton
							onClick={handleGameInvite}
							sx={{
								width: "40px",
								height: "40px",
								color: theme.palette.secondary.main,
								"&:hover": {
									color: "#BF77F6",
								},
							}}
						>
							<GameIcon/>
						</IconButton>
					<IconButton
						onClick={() => { toggleChatStatus(ChatStatus.Bubble, undefined) }}
						sx={{
							marginLeft: 'auto',
							color: (theme) => theme.palette.secondary.main,
							'&:hover': {
								color: (theme) => theme.palette.error.main,
							},
						}}
					>
						<CancelIcon />
					</IconButton>
        </Stack>
        <Stack
          direction={"column"}
          sx={{ flexGrow: 1, overflowY: "auto", maxHeight: "50vh" }}
        >
          <Stack
            ref={messagesEndRef}
            flexGrow={1}
            direction="column-reverse"
            bgcolor={(theme) => theme.palette.background.default}
            border={2}
            borderColor={(theme) => theme.palette.primary.light}
            sx={{
              height: "calc(70vh - 130px)",
              overflowY: "auto",
              "&": {
                scrollbarWidth: "thin",
                scrollbarColor: (theme) =>
                  `${theme.palette.primary.dark} transparent`,
              },
              "&:hover": {
                scrollbarColor: `${theme.palette.secondary.dark} transparent`,
              },
            }}
          >
						<MessagesBox
							messageStyle='dm'
							messages={messagesArray}
						/>
						<LoadingBox sx={{ display: chatProps.loading ? "flex" : "none" }}>
							<CircularProgress size={70} />
						</LoadingBox>
          </Stack>
          <StatusTypography
            hidden={!Boolean(errorMessage)}
            sx={{
              alignSelf: "center",
              color: "red",
            }}
          >
            {errorMessage}
          </StatusTypography>
        </Stack>
        <Stack
          direction={"row"}
          sx={{
            marginY: "0.3em",
            marginX: "0.4em",
            position: "sticky",
            bottom: 0,
            zIndex: 1,
            bgcolor: (theme) => theme.palette.primary.dark,
            borderBottomLeftRadius: "1em",
            borderBottomRightRadius: "1em",
            height: "50px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <InputBase
            inputRef={inputRef}
            disabled={isDisabled}
            sx={{
              flexGrow: 1,
              color: (theme) => theme.palette.secondary.main,
              border: "1px solid #ced4da",
              padding: "0.4em",
              paddingLeft: "1em",
              borderRadius: "5em",
              borderColor: (theme) => theme.palette.divider,
              "&:hover": {
                borderColor: (theme) => theme.palette.divider,
              },
              "&.Mui-focused": {
                borderColor: (theme) => theme.palette.divider,
                boxShadow: (theme) =>
                  `0 0 0 2px ${theme.palette.primary.light}`,
              },
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder={"Type a message..."}
          />
          <Button
            variant="contained"
            color="secondary"
            onClick={handleSend}
            disabled={isDisabled}
            sx={{
              marginLeft: "0.5em",
              borderRadius: "0.8em",
              width: "40px",
              minWidth: "40px",
              height: "40px",
            }}
          >
            <SendIcon />
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ContentChat;
