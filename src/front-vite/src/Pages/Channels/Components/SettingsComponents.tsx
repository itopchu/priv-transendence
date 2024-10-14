import { Box, Divider, styled, SxProps, Theme } from "@mui/material";
import { CustomScrollBox } from "../Components/Components";

export const SettingsTextFieldSx = (theme: Theme): SxProps<Theme> => ({
  '& .MuiInputBase-input': {
		textAlign: 'center',
    padding: '0px 4px',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    lineHeight: 1.334,
    letterSpacing: '0em',
		[theme.breakpoints.up('md')]: {
			textAlign: 'left',
		},
  },
})

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
}));
