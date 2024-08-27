import { styled, Avatar, Card, FormLabel } from "@mui/material";
import { Box } from "@mui/system";

export const CenteredCard = styled(Card)(({ theme }) => ({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: theme.spacing(1),
  maxWidth: 500,
  width: '100%',
  textAlign: 'center',
  boxShadow: theme.shadows[5],
  height: '50%',
  zIndex: 13000,
}));

export const LoadingCard = styled(Box)(() => ({
	display: 'flex',
	justifyContent: 'center',
	alignItems: 'center',
	height: '100%'
}));

export const Overlay = styled(Box)(({}) => ({
  position: 'fixed',
	top: 0,
	left: 0,
	width: '100%',
	height: '100%',
	backgroundColor: 'rgba(0, 0, 0, 0.7)',
	zIndex: 12999,
}));

export const CircleAvatar = styled(Avatar)(({ theme }) => ({
  width: 180,
  height: 180,
  margin: '0 auto',
  marginBottom: theme.spacing(3),
  border: '3px solid',
  borderColor: theme.palette.primary.dark,
}));

export const CustomFormLabel = styled(FormLabel)(() => ({
  fontSize: '.9rem',
  fontWeight: 550,
}));

export const ButtonBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  width: '90%',
  position: 'fixed',
  padding: theme.spacing(1),
  bottom: 0,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

export const TextFieldWrapper = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  textAlign: 'left',
}));

