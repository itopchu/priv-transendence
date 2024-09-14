import { Upload } from "@mui/icons-material";
import { Avatar, Box, Button, styled, Typography } from "@mui/material";
import React, { ReactElement } from "react";

export const CustomAvatar = styled(Avatar)(({ theme }) => ({
  margin: '0 auto',
  border: '3px solid',
  borderColor: theme.palette.primary.dark,
}));

export interface AvatarButtonType {
	src?: string;
	clickEvent?: () => void;
	children?: ReactElement[];
	avatarSx?: object;
	sx?: object;
}

export interface ImageInputType {
	children?: ReactElement[];
	onFileInput?: (file: File) => void;
}

export const CustomScrollBox = styled(Box)(({ theme }) => ({
	overflowY: 'auto',
	padding: theme.spacing(.5),

	'&::-webkit-scrollbar-track': {
		backgroundColor: theme.palette.secondary.dark,
		borderRadius: '1em',
	},
	'&::-webkit-scrollbar': {
		width: '4px',
	},
	'&::-webkit-scrollbar-thumb': {
		backgroundColor: theme.palette.primary.main,
		borderRadius: '1em',
	},
}));

export const DescriptionBox = styled(CustomScrollBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  width: '100%',
  maxHeight: '6em',
  backgroundColor: theme.palette.primary.main,
  borderRadius: '1em',
  padding: theme.spacing(2),
  overflow: 'auto',
  boxShadow: theme.shadows[3],
}));

export const AvatarUploadIcon = styled(Upload)(({ theme }) => ({
	  position: 'absolute',
	  top: '50%',
	  left: '50%',
	  transform: 'translate(-50%, -50%)',
	  color: theme.palette.secondary.main,
	  visibility: 'hidden',
	  fontSize: '4em',
}));

export const ImageInput: React.FC<ImageInputType> = ({ children, onFileInput }) => {
	return (
	  <input
		type="file"
		hidden
		accept="image/jpeg, image/png"
		onChange={(event) => {
		  if (!onFileInput) return;

		  if (event.target.files && event.target.files[0]) {
			onFileInput(event.target.files[0]);
		  }
		}}
	  >
	    {children}
	  </input>
	)
}

export const ClickTypography = styled(Typography)(({}) => ({
	cursor: 'pointer',
	'&:hover': {
	  textDecoration: 'underline',
	}
}));

export const ButtonAvatar: React.FC<AvatarButtonType> = ({ children, src, clickEvent, avatarSx, sx }) => {
	return (
		<Button
		  component="label"
		  onClick={clickEvent}
		  sx={{
			aspectRatio: '1:1',
			padding: 0,
			borderRadius: '50%',
			minWidth: 0,
			width: 'fit-content',
			height: 'fit-content',
			'.image-profile': {
			  transition: 'filter 0.3s ease',
			},
			...sx
		  }}
		>
		  <CustomAvatar className="image-profile" src={src} sx={{ ...avatarSx }} />
		  {children}
		</Button>
	);
}

export const UploadAvatar: React.FC<AvatarButtonType> = ({ children, src, clickEvent, avatarSx, sx }) => (
	<ButtonAvatar
		src={src}
		clickEvent={clickEvent}
		avatarSx={avatarSx}
		sx={{
			'&:hover .image-profile': {
			  filter: 'brightness(50%) blur(2px)',
			},
			'&:hover .hidden-icon': {
			  visibility: 'visible',
			},
			...sx
		}}
	>
		{children}
	</ButtonAvatar>
);

export const lonelyBox = () => (
	<Box
		sx={{
			position: 'relative',
			height: '80vh',
			backgroundColor: (theme) => theme.palette.primary.light,
			display: 'flex',
			flexDirection: 'column',
			padding: (theme) => theme.spacing(2),
			justifyContent: 'center',
			alignItems: 'center'
		}}
	>
		<span style={{fontSize: '50px', fontWeight: 'bold', opacity: '0.5'}}>SUCH EMPTINESS</span>
	</Box>
)

