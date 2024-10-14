import { styled, Card, FormLabel, CardContent, Box } from "@mui/material";

export const CustomCardContent = styled(CardContent)(() => ({
	display: 'flex',
	flexDirection: 'column',
	height: '100%',
	padding: '0px',
}));

export const BarCard = styled(Card)(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	padding: theme.spacing(1),
	backgroundColor: theme.palette.primary.main,
	minWidth: '300px'
}));

export const CenteredCard = styled(Card)(({ theme }) => ({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: theme.spacing(3),
  width: '34em',
  height: '30em',
  textAlign: 'center',
  boxShadow: theme.shadows[5],
  zIndex: 13000,
}));

export const CardLoadingBox = styled(Box)(() => ({
	position: 'absolute',
	top: 0,
	left: 0,
	display: 'flex',
	justifyContent: 'center',
	alignItems: 'center',
	height: '100%',
	width: '100%',
	overflow: 'visible',
}));

export const CardOverlay = styled(Box)(({}) => ({
  position: 'fixed',
	top: 0,
	left: 0,
	width: '100%',
	height: '100%',
	backgroundColor: 'rgba(0, 0, 0, 0.7)',
	zIndex: 12999,
}));

export const CustomFormLabel = styled(FormLabel)(() => ({
  fontSize: '.9rem',
  fontWeight: 550,
}));

export const ButtonBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  padding: theme.spacing(1),
  marginTop: 'auto',
  marginBottom: '-35px',
  borderTop: `1px solid ${theme.palette.divider}`,
}));

export const TextFieldWrapper = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  width: '100%',
  textAlign: 'left',
}));

