import { alpha, Box, Stack, Typography, useTheme } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { InviteMessage } from "../Channels/Components/ChatBoxComponents";
import React from "react";

const InvitePage: React.FC = () => {
  const theme = useTheme();
	const navigate = useNavigate();
  const inviteLink = useLocation().pathname;

	function handleJoin() {
		navigate('/channels');
	}

  return (
    <Box
      sx={{
        gap: '2em',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '2em',
				overflow: 'hidden',
      }}
    >
      <Stack
        spacing={4}
        bgcolor={alpha(theme.palette.background.default, 0.3)}
        borderRadius={'1em'}
        padding={'2em'}
        sx={{
          boxShadow: `3px 9px 10px rgba(0, 0, 0, 0.5)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="h4"
          sx={{
            color: 'secondary.main',
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          You have been invited to...
        </Typography>
				<InviteMessage
					neverSmall
					showInvitation={false}
					link={inviteLink}
					onJoin={handleJoin}
					variant="underButton"
					avatarSx={{
						height: '4em',
						width: '4em',
					}}
					bubbleSx={{
						flexGrow: 1,
						alignSelf: 'center',
						paddingBottom: theme.spacing(2.3),
						boxShadow: `2px 2px 3px 0px ${theme.palette.primary.dark}`,
						minWidth: '250px',
					}}
				/>
      </Stack>
    </Box>
  );
};

export default InvitePage
