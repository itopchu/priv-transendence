import { Stack, styled } from "@mui/material";

export const HeaderStack = styled(Stack)(({ theme }) => ({
	height: '64px',
	backgroundColor: theme.palette.primary.main,
	alignItems: 'center',
}));
