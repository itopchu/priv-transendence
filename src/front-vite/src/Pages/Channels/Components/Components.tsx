import { SvgIconComponent, Upload } from "@mui/icons-material";
import {
	Avatar,
	Box,
	Button,
	IconButton,
	IconProps,
	InputAdornment,
	InputBase,
	Stack,
	styled,
	SxProps,
	TextField,
	TextFieldVariants,
	Theme,
	Typography,
    useTheme
} from "@mui/material";
import {
	Menu as ShowChannelLineIcon,
	MenuOpen as HideChannelLineIcon,
	Search as SearchIcon,
	Visibility as ShowPasswordIcon,
	VisibilityOff as HidePasswordIcon,
	PeopleRounded as DefaultChannelIcon,
} from '@mui/icons-material'
import React, { forwardRef, ReactNode, useState } from "react";
import { useChannelLine } from "../../../Providers/ChannelContext/ChannelLine";

interface IHeaderIconButtonType {
	Icon: SvgIconComponent;
	label?: string;
	iconFontSize?: string;
	onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

interface IImageInput {
	children?: ReactNode;
	onFileInput?: (file: File) => void;
}

type ChannelAvatarType = {
	sx?: SxProps<Theme>,
	iconSx?: SxProps<Theme>,
	src?: string,
	alt?: string,
	className?: string,
	variant?: 'default' | 'channel',
	Icon?: React.FC<IconProps>;
}

export const CustomAvatar: React.FC<ChannelAvatarType> = ({
	sx,
	iconSx,
	src,
	alt,
	className,
	Icon,
	variant = 'default'
}) => {
	const defaultIconSx = { width: '70%', height: '70%', ...iconSx }
	const defaultIcon = Icon ? (
			<Icon sx={defaultIconSx} />
		) : (
			variant === 'default' ? undefined : <DefaultChannelIcon sx={defaultIconSx} />
		);

	return (
		<Avatar
			className={className}
			alt={alt}
			src={src}
			sx={{
				border: (theme) => `3px solid ${theme.palette.primary.dark}`,
				...sx, 
			}}
		>
			{defaultIcon}
		</Avatar>
	);
};

export const scrollStyleSx: SxProps<Theme> = {
	overflowY: 'auto',
	paddingInline: (theme: Theme) => theme.spacing(.5),

	'&::-webkit-scrollbar-track': {
		backgroundColor: 'transparent',
	},
	'&::-webkit-scrollbar': {
		width: '4px',
	},
	'&::-webkit-scrollbar-thumb': {
		backgroundColor: 'transparent',
		borderRadius: '1em',
	},
	'&:hover': {
		'&::-webkit-scrollbar-thumb': {
			backgroundColor: (theme: Theme) => theme.palette.primary.main,
		},
	},

	msOverflowStyle: 'none',
	'&:not(:hover)': {
		'&::-webkit-scrollbar-thumb': {
			backgroundColor: 'transparent',
		},
	}
};

export const CustomScrollBox = styled(Box)(({ theme }) => ({
	overflowY: 'auto',

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
	zIndex: 3,
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

type ClickTypographyType = {
	disabled?: boolean,
}

export const ClickTypography = styled(Typography)<ClickTypographyType>(({ disabled }) => ({
	cursor: disabled ? 'default' : 'pointer',
	pointerEvents: disabled ? 'none' : 'auto',
	'&:hover': {
	  textDecoration: disabled ? 'none' : 'underline',
	}
}));

export const LoadingBox = styled(Box)(() => ({
	display: 'flex',
	flexGrow: 1,
	justifyContent: 'center',
	alignItems: 'center',
	overflow: 'visible',
}));

interface IAvatarButton {
	src?: string;
	variant?: 'default' | 'channel';
	clickEvent?: (event: React.MouseEvent<HTMLElement>) => void;
	children?: ReactNode;
	avatarSx?: SxProps<Theme>;
	avatarIconSx?: SxProps<Theme>;
	defaultIcon?: React.FC<IconProps>;
	sx?: SxProps<Theme>;
}

export const ButtonAvatar: React.FC<IAvatarButton> = ({
	children,
	variant = 'default',
	defaultIcon,
	clickEvent,
	avatarIconSx,
	avatarSx,
	src,
	sx,
}) => {
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
			<CustomAvatar
				variant={variant}
				className="image-profile"
				src={src}
				Icon={defaultIcon}
				iconSx={avatarIconSx}
				sx={avatarSx}
			/>
		  {children}
		</Button>
	);
}

export const UploadAvatar: React.FC<IAvatarButton> = ({
	variant = 'default',
	children,
	avatarIconSx,
	defaultIcon,
	clickEvent,
	avatarSx, 
	src,
	sx,
}) => (
	<ButtonAvatar
		variant={variant}
		src={src}
		clickEvent={clickEvent}
		avatarSx={avatarSx}
		avatarIconSx={avatarIconSx}
		defaultIcon={defaultIcon}
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

export const LonelyBox: React.FC = () => {
	const theme = useTheme();
	const { channelLineProps, changeLineProps } = useChannelLine();

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

interface ISearchBar {
	sx?: object;
	boxSx?: object;
	style?: object;
	value?: string;
	ref?: any;
	inputChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
	onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

export const SearchBar = forwardRef<HTMLInputElement, ISearchBar>(({ sx, boxSx, style, value, inputChange, onBlur, onFocus }, ref) => (
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
			onBlur={onBlur}
			onFocus={onFocus}
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

interface IPasswordTextField {
	placeholder?: string;
	ref?: HTMLInputElement;
	inputChange?: () => void;
	value?: string;
	fullWidth?: boolean,
	variant?: TextFieldVariants;
	style?: Object;
	sx?: SxProps<any>;
}

export const PasswordTextField = forwardRef<HTMLInputElement, IPasswordTextField>(({
	inputChange,
	placeholder,
	fullWidth,
	variant,
	value,
	style,
	sx,
}, ref) => {
	const [visible, setVisible] = useState(false);

	return (
		<TextField
			placeholder={placeholder || "Enter password..."}
			inputRef={ref}
			onChange={inputChange}
			variant={variant}
			value={value}
			type={visible ? "default" : "password"}
			fullWidth={fullWidth}
			autoComplete='off'
			inputProps={{ maxLength: 24 }}
			InputProps={{
				style: style,
				endAdornment: (
					<InputAdornment position='end' >
						<IconButton
							onClick={() => setVisible((prev) => !prev)}
							size="small"
						>
							{visible ? <HidePasswordIcon /> : <ShowPasswordIcon />}
						</IconButton>
					</InputAdornment>
				),
			}}
			sx={sx}
		/>
	);
})
