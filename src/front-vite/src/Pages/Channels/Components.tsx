import { Upload } from "@mui/icons-material";
import { Avatar, Button, styled, Typography } from "@mui/material";
import { availableMemory } from "process";
import React, { Children, ReactElement } from "react";
import { styleText } from "util";

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
			'.image-profile': {
			  transition: 'filter 0.3s ease',
			},
			...sx
		}}
	>
		{children}
	</ButtonAvatar>
);
