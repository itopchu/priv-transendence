import { SvgIconComponent, Upload } from "@mui/icons-material";
import {
	Avatar,
	Box,
	Button,
	Hidden,
	IconButton,
	InputAdornment,
	InputBase,
	Stack,
	styled,
	Typography,
    useTheme
} from "@mui/material";
import {
	Menu as ShowChannelLineIcon,
	MenuOpen as HideChannelLineIcon,
	Search as SearchIcon,
} from '@mui/icons-material'
import React, { forwardRef, ReactElement } from "react";
import { useChannel } from "../../../Providers/ChannelContext/Channel";

export const CustomAvatar = styled(Avatar)(({ theme }) => ({
  margin: '0 auto',
  border: '3px solid',
  borderColor: theme.palette.primary.dark,
}));

export interface IHeaderIconButtonType {
	Icon: SvgIconComponent;
	label?: string;
	iconFontSize?: string;
	onClick?: () => void;
}

export interface IAvatarButton {
	src?: string;
	clickEvent?: () => void;
	children?: ReactElement[];
	avatarSx?: object;
	sx?: object;
}

export interface ISearchBar {
	sx?: object;
	boxSx?: object;
	style?: object;
	value?: string;
	ref?: any;
	inputChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface IImageInput {
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

export const Overlay = styled(Box)(() => ({
	position: 'absolute',
	top: 0,
	left: 0,
	width: '100%',
	height: '100%',
	backgroundColor: 'rgba(0, 0, 0, .5)',
	zIndex: 1,
}))

export const DescriptionBox = styled(CustomScrollBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  width: '100%',
  maxHeight: '7.5em',
  backgroundColor: theme.palette.primary.main,
  borderRadius: '1em',
  padding: theme.spacing(1),
  overflowY: 'auto',
	overflowX: 'hidden',
  boxShadow: theme.shadows[3],
	boxSizing: 'border-box',
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

export const ImageInput: React.FC<IImageInput> = ({ children, onFileInput }) => {
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

export const ChatBubble = styled(Box)(({ theme }) => ({
  display: 'flex',
  backgroundColor: theme.palette.primary.main,
  borderRadius: '1.5em',
  alignSelf: 'flex-start',
  padding: '6px 1em',
  wordBreak: 'break-word',
  overflowY: 'auto',
  overflowX: 'hidden',
  width: 'fit-content',
}));

export const LoadingBox = styled(Box)(() => ({
	display: 'flex',
	flexGrow: 1,
	justifyContent: 'center',
	alignItems: 'center',
	overflow: 'visible',
}));

export const ButtonAvatar: React.FC<IAvatarButton> = ({ children, src, clickEvent, avatarSx, sx }) => {
	return (
		<Button
			aria-label="Avatar Button"
		  component="label"
		  onClick={clickEvent}
		  sx={{
			aspectRatio: '1:1',
			padding: 0,
			borderRadius: '50%',
			minWidth: 'fit-content',
			minHeight: 'fit-content',
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

export const UploadAvatar: React.FC<IAvatarButton> = ({ children, src, clickEvent, avatarSx, sx }) => (
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

export const lonelyBox = () => {
	const theme = useTheme();
	const { channelLineProps, changeLineProps } = useChannel();

	return (
		<Stack
			sx={{
				bgcolor: theme.palette.primary.light,
				position: 'relative',
				height: '80vh',
			}}
		>
			<Stack
				padding={theme.spacing(2)}
				spacing={theme.spacing(1)}
				sx={{
					height: '65px',
					width: '80px',
					borderBottom: `1px solid ${theme.palette.secondary.dark}`,
					borderRight: `1px solid ${theme.palette.secondary.dark}`,
					borderBottomRightRadius: '2em',
					bgcolor: theme.palette.primary.main,
					alignItems: 'center',
					justifyContent: 'center',
					paddingRight: 2.7,
				}}
			>
				<HeaderIconButton
					Icon={channelLineProps.hidden ? ShowChannelLineIcon : HideChannelLineIcon}
					onClick={() => changeLineProps({ hidden: !channelLineProps.hidden })}
				/>
			</Stack>
			<Box
				sx={{
					backgroundColor: (theme) => theme.palette.primary.light,
					display: 'flex',
					padding: (theme) => theme.spacing(2),
					justifyContent: 'center',
					alignItems: 'center',
					flexGrow: 1,
				}}
			>
				<span
					style={{
						textAlign: 'center',
						fontSize: '50px',
						fontWeight: 'bold',
						opacity: '0.5'
					}}
				>
					SUCH EMPTINESS
				</span>
			</Box>
		</Stack>
	);
}

export const SearchBar = forwardRef<HTMLInputElement, ISearchBar>(({ sx, boxSx, style, value, inputChange }, ref) => (
	<Box
		sx={{
			display: 'flex',
			flexDirection: 'row',
			position: "relative",
			...boxSx
		}}
		style={{
			...style
		}}
	>
		<InputBase
			placeholder="Search"
			inputRef={ref}
			value={value}
			onChange={inputChange}
			endAdornment={
				<InputAdornment position='end' >
					<SearchIcon />
				</InputAdornment>
			}
			sx={{
				height: "2em",
				borderRadius: "0.5em",
				padding: "0.2em 0.5em",
				backgroundColor: (theme) => theme.palette.primary.dark,
				...sx
			}}
		/>
	</Box>
))

export const HeaderIconButton: React.FC<IHeaderIconButtonType> = ({ Icon, onClick, iconFontSize, label }) => (
		<IconButton
			aria-label={label}
			sx={{ width: '40px', height: '40px' }}
			onClick={onClick}
		>
			<Icon sx={{ fontSize: iconFontSize || '32px' }} />
		</IconButton>
)
