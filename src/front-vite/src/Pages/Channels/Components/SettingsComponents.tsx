import { Box, Divider, styled, TextField } from "@mui/material";
import { CustomScrollBox } from "../Components/Components";

export const SettingsTextField = styled(TextField)(({ theme }) => ({
	'& input': {
		textAlign: 'center',
		[theme.breakpoints.up('sm')]: {
			textAlign: 'left',
		},
	},
  '& .MuiInputBase-input': {
    padding: '0px 4px',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    lineheight: 1.334,
    letterspacing: '0em',
  },
}));

export const SettingsContainer = styled(CustomScrollBox)(({ theme }) => ({
  position: 'relative',
  height: '80vh',
  backgroundColor: theme.palette.primary.light,
  display: 'flex',
  flexDirection: 'column',
}));

export const SettingsDivider = styled(Divider)(() => ({
  width: '70%',
  '&::before, &::after': {
    borderWidth: '3px',
    borderRadius: '1em',
  },
  fontSize: '1.3em',
  fontWeight: 'bold',
}));

export const SettingsUserCardBox = styled(Box)(() => ({
	maxHeight: '30em',
	minWidth: '65%',
	overflowY: 'auto',
	'&::-webkit-scrollbar': { width: '0px' },
}));
