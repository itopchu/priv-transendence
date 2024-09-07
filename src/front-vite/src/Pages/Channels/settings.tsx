import { Avatar, Box, Divider, Stack, styled, useTheme, Typography, Card, IconButton, Menu, MenuItem, Button, TextField, ButtonGroup, linearProgressClasses, Select, FormControl, capitalize } from "@mui/material";
import { ChannelMember, ChannelRole, ChannelRoleValues, ChannelType, ChannelTypeValues, useChannel } from "./channels";
import React, { useEffect, useRef, useState } from "react";
import {
	MoreVert as UserMenuIcon,
	ModeEdit as EditIcon,
	EditOff as EditOffIcon,
	Check as ApplyEditIcon,
} from '@mui/icons-material';
import { DescriptionBox } from "./CardComponents";
import axios, { AxiosError } from "axios";
import { SelectedType } from ".";
import { ButtonAvatar, CustomAvatar, AvatarUploadIcon, ImageInput, UploadAvatar, ClickTypography } from "./Components";
import { useUser } from "../../Providers/UserContext/User";
import { useNavigate } from "react-router-dom";

const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';

const ModerateOptions: string[] = [
	'mute',
	'kick',
	'ban',
]

type ChannelDataType = {
  image: File | undefined;
  type: ChannelType;
};

export const validateFile = (file: File): boolean => {
	if (!file) return (false);

	if (!file.type.startsWith('image/')) {
		alert('Please select a valid image file.');
		return (false);
	}

	const maxSizeInMB = 5;
	const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
	if (file.size > maxSizeInBytes) {
		alert('File size exceeds 5MB. Please select a smaller file.');
		return (false);
	}
	return (true);
}

const SettingsTextField =  styled(TextField)(({ theme  }) =>({
	'& .MuiInputBase-input': {
		padding: '0px 4px',
		fontSize: '1.5rem',
		fontWeight: 'bold',
		lineheight: 1.334,
		letterspacing: '0em',
	},
}))

const CustomScrollBox = styled(Box)(({ theme }) => ({
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

const ChatContainer = styled(CustomScrollBox)(({ theme }) => ({
  position: 'relative',
  height: '80vh',
  backgroundColor: theme.palette.primary.light,
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(2),
}));

const SettingsDivider = styled(Divider)(({ theme }) => ({
	width: '70%',
	'&::before, &::after':{
		borderWidth: '3px',
		borderRadius: '1em',
	},
	fontSize: '1.3em',
	fontWeight: 'bold',
}));

interface SettingsBoxType {
	membership: ChannelMember;
	setSelected: React.Dispatch<React.SetStateAction<SelectedType>>;
}

export const SettingsBox:  React.FC<SettingsBoxType> = ({ membership, setSelected }) => {
	const theme = useTheme();
	const navigate = useNavigate();

	const { triggerRefresh } = useChannel();
	const { user } = useUser();

	const passwordRef = useRef<HTMLInputElement>(null);
	const descriptionRef = useRef<HTMLInputElement>(null);
	const nameRef = useRef<HTMLInputElement>(null);

	const channel = membership.channel;
	const members = channel.members;

	const initialAvatarSrc = `${BACKEND_URL}/${channel.image}`;
	const initialChannelData: ChannelDataType = {
		type: channel.type,
		image: undefined,
	}

	const isAdmin = membership.role === ChannelRole.admin;
	const isMod = membership.role === ChannelRole.moderator || isAdmin;

	const [editMode, setEditMode] = useState(false);
	const [avatarSrc, setAvatarSrc] = useState(initialAvatarSrc);
	const [channelData, setChannelData] = useState(initialChannelData);

	useEffect(() => {
		if (editMode) {
			setEditMode(false);
		}
		if (channelData !== initialChannelData || avatarSrc !== initialAvatarSrc) {
			reset();
		}
	}, [membership.id]);

	useEffect(() => {
		if (!editMode || !nameRef.current || !descriptionRef.current) return;

		nameRef.current.value = channel.name;
		descriptionRef.current.value = channel.description;
	}, [editMode]);

	const reset = () => {
		setAvatarSrc(initialAvatarSrc);
		setChannelData(initialChannelData);
	}

	const changeChannelData = (newData: Partial<ChannelDataType>) => {
		setChannelData((prevData) => ({
			...prevData,
			...newData,
		}));
	};

	const onChangeRole = async (member: ChannelMember, newRole: ChannelRole) => {
		const payload = {
			role: newRole,
		};

		try {
			await axios.patch(`${BACKEND_URL}/channel/member/${member.id}`, payload, {
				withCredentials: true,
			});
			member.role = newRole;
		} catch (error) {
			alert(error);
		}
	}

	const onApply = async () => {
		const cleanName = nameRef.current?.value.trim();
		const password = passwordRef.current?.value;
		const description  = descriptionRef.current?.value;

		const payload = new FormData();
		if (channelData.type !== channel.type) {
			payload.append('type', channelData.type);
		}
		if (channelData.image) {
			payload.append('image', channelData.image);
		}
		if (cleanName) {
			payload.append('name', cleanName);
		}
		if (password && password !== '') {
			payload.append('password', password);
		}
		if (description && description !== channel.description)  {
			payload.append('description', description);
		}
		try {
			await axios.patch(`${BACKEND_URL}/channel/${channel.id}`, payload, {
				withCredentials: true,
			});
			triggerRefresh();
			setEditMode(!editMode);
			reset();
		} catch (error: any) {
			alert(error?.response?.data?.message);
		}
	}

	const onModerate = async (member: ChannelMember, option: string)  => {
		const payload = {
			victimId: member.user.id,
		}
		try {
			await axios.patch(`${BACKEND_URL}/channel/${option}/${channel.id}`, payload, {
				withCredentials: true,
			});
			triggerRefresh();
		} catch(error: any) {
			alert(error?.response?.data?.message);
		}
	}

	const onEditMode = () => {
		setEditMode(!editMode);

		if (editMode) {
			reset();
		}
	}

	const onDelete = async () => {
		if (!confirm(`Are you sure you want to delete ${channel.name}?`)) return;

		try {
			await axios.delete(`${BACKEND_URL}/channel/${channel.id}`, {
				withCredentials: true,
			});
			triggerRefresh();
			setSelected((prev) => ({ 
				...prev,
				settings: undefined,
			}));
		} catch (error) {
			alert(error);
		}
	}

	const onLeave = async () => {
		if (!confirm(`Are you sure you want to leave ${channel.name}?`)) return;

		try {
			await axios.delete(`${BACKEND_URL}/channel/leave/${membership.id}`, {
				withCredentials: true,
			});
			triggerRefresh();
			setSelected((prev) => ({ 
				...prev,
				settings: undefined,
			}));
		} catch (error: any) {
			alert(error?.response?.data?.message);
		}
	}

	const onFileUpload = (file: File) => {
		if (!validateFile(file)) return;

		changeChannelData({ image: file });
		const reader = new FileReader();
		reader.onloadend = () => {
		  setAvatarSrc(reader?.result as string);
		};
		reader.readAsDataURL(file);
	};

	const generateButtonGroup = () => {
		return (
		  <ButtonGroup fullWidth sx={{ mb: 2 }}>
			{Array.from({ length: 3 }, (_, index) => (
			  <Button
				key={index}
				variant={
				  channelData.type === ChannelTypeValues[index]
					? 'contained'
					: 'outlined'
				}
				onClick={() => changeChannelData({ type: ChannelTypeValues[index] })}
			  >
				{ChannelTypeValues[index]}
			  </Button>
			))}
		  </ButtonGroup>
		);
	};

	const UserCards = () => {
	  return (
		  <>
			  {members.map((member, index) => {
				  const memberInfo = member.user;
				  const isDiffUser = memberInfo.id !== user.id;
				  const membername = memberInfo.nameNick
					? memberInfo.nameNick
					: `${memberInfo.nameFirst} ${memberInfo.nameLast}`;

				  const [anchorEl, setAnchorEl] = useState<any>(null);

				  const handleMenuClick = (event: any) => {
					  setAnchorEl(event.currentTarget);
				  };

				  const handleMenuClose = () => {
					  setAnchorEl(null);
				  };

				  return (
					<Card
					  key={index}
					  sx={{
						  display: 'flex',
						  alignItems: 'center',
						  padding: 2,
						  maxWidth: 600,
						  minWidth: '65%',
						  backgroundColor: theme.palette.primary.main,
					  }}
					>
					  <ButtonAvatar
						src={`${BACKEND_URL}/${memberInfo?.image}`}
						clickEvent={() => {navigate(`/profile/${member.user.id}`)}}
						avatarSx={{
							width: 56,
							height: 56,
							border: 0,
						}}
						sx={{
							marginRight: 2,
							boxShadow: theme.shadows[5],
						}}
					  />

					  <Stack spacing={editMode  && member.role !== ChannelRole.admin ? -1 : 0}>
						<Stack direction="row" spacing={1} >
						  <ClickTypography
							variant="h3" 
							fontSize='1.1em'
							fontWeight='bold'
							onClick={() => {navigate(`/profile/${member.user.id}`)}}
						  >
							{membername}
						  </ClickTypography>

						  {editMode && member.role !== ChannelRole.admin
							? (
								<FormControl variant="standard" sx={{ width: 'auto' }}>
								  <Select
									sx={{ height: '50%', fontSize: 'small', marginTop: '2px' }}
									value={ChannelRoleValues[member.role]}
								  >
									{ChannelRoleValues.map((role, index) => {
										if (index === 0) return;

										return (
											<MenuItem key={index} value={role} onClick={() => onChangeRole(member, index as ChannelRole)} >
												{role}
											</MenuItem>
										);
									})}
								  </Select>
								</FormControl>
							) : (
								<Typography variant="caption" color="textSecondary" fontSize='.8em' alignSelf='flex-end' >
									{ChannelRoleValues[member.role]}
								</Typography>
							)
						}
						</Stack>

						<Box maxHeight='3.6em' maxWidth='31em' overflow='hidden' textOverflow='ellipsis'>
						  <Typography variant="body1" color="textSecondary" sx={{
							  display: '-webkit-box',
							  WebkitLineClamp: 2,
							  WebkitBoxOrient: 'vertical',
							}}
						  >
							{memberInfo.greeting}
						  </Typography>
						</Box>
					  </Stack>

					  {isDiffUser && 
						  <Box sx={{ marginLeft: 'auto' }} >
						  <IconButton onClick={handleMenuClick}>
							<UserMenuIcon />
						  </IconButton>
						  <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
							{isAdmin && ([
									<MenuItem onClick={() => onModerate(member, 'transfer')}>Transfer admin</MenuItem>,
									<Divider />
							])}
							<MenuItem onClick={handleMenuClose}>{`Add ${membername}`}</MenuItem>
							<MenuItem onClick={handleMenuClose}>{`Block ${membername}`}</MenuItem>
							{isMod && ([
									<Divider />,
									ModerateOptions.map((option, index) => {
										const capitalizedOption = member.muted && option === 'mute'
										? option.charAt(0).toUpperCase() + option.slice(1)
										: 'unmute';

										return (
											<MenuItem
												key={index}
												onClick={() => onModerate(member, option)}
												sx={{ color: 'red' }}
											>
												{`${capitalizedOption} ${membername}`}
											</MenuItem>
										);
									})
							])}
						  </Menu>
						  </Box>
					  }
					</Card>
			  )})}
		  </>
	  );
	};

	const ChannelDetails = () => {
		return (
			<>
				<Stack
					direction={'row'}
					justifyContent={'center'}
					spacing={3}
					alignItems={'center'}
				>
					{editMode ? (
						<UploadAvatar 
							src={avatarSrc}
							avatarSx={{
								height: '7em',
								width: '7em',
							}}
						>
						  <AvatarUploadIcon className="hidden-icon" />
						  <ImageInput onFileInput={onFileUpload} />
						</UploadAvatar>
					) : (
						<CustomAvatar
							src={`${BACKEND_URL}/${channel?.image}`}
							sx={{
								height: '7em',
								width: '7em',
							}}
						/>
					)}

					<Stack spacing={editMode ? 1 : 0} >
						{editMode
							? (
								<SettingsTextField
									inputRef={nameRef}
									variant="standard"
									placeholder={nameRef.current?.value === ''
										? undefined
										: 'Enter channel name...'
									}
								/>
							) : (
								<Typography variant='h5' fontWeight='bold'>
									{channel.name}
								</Typography>
						)}
						{(editMode && isAdmin)
							? (
								<>
									{channelData.type === ChannelType.protected && (
										<SettingsTextField
											inputRef={passwordRef}
											variant="standard"
											placeholder={passwordRef.current?.value === ''
												? undefined
												: 'Enter a password...'
											}
											type="password"
										>
										</SettingsTextField>
									)}
									{generateButtonGroup()}
								</>
							) : (
								<Typography variant="body1" color={'textSecondary'}>
									{`${channel.type} • ${members.length}\
									${members.length > 1 ? 'members' : 'member'}`}
								</Typography>
							)
						}
					</Stack>
				</Stack>

				<DescriptionBox sx={{ width: '65%' }} >
					{editMode
						? (
							<TextField
								inputRef={descriptionRef}
								variant="standard"
								fullWidth
								multiline
								maxRows={4}
								placeholder={descriptionRef.current?.value === ''
									? undefined
									: 'Enter a description...'
								}
							/>
						) : (
							<Typography sx={{ wordBreak: 'break-word', whiteSpace: 'pre', }}>
								{channel.description}
							</Typography>
						)
					}
				</DescriptionBox>
			</>
		);
	}

	return (
		<ChatContainer >
			<Stack direction={'row'} padding={0}>
				<Stack padding={2} spacing={3} alignItems='center' minWidth={'calc(100% - 48px)'} >
					{ChannelDetails()}
					
					<SettingsDivider>Members</SettingsDivider>

					<Box
						sx={{
							maxHeight: '30em',
							minWidth: '65%',
							overflowY: 'auto',
							'&::-webkit-scrollbar': { width: '0px' },
						}}
					>
						<Stack spacing={1} >
							<UserCards />
						</Stack>
					</Box>

					{(!editMode || isAdmin) && (
						<>
							<SettingsDivider>{editMode ? 'Hate this Channel?' : 'Leaving?'}</SettingsDivider>

							<Box sx={{ marginTop: 3, textAlign: 'center' }}>
								<Button
									variant="contained"
									color="error"
									onClick={editMode ? onDelete : onLeave}
								>
									{editMode ? 'Delete Channel' : 'Leave Channel'}
								</Button>
							</Box>
						</>
					)}
				</Stack>

				{isMod && (
					<Box sx={{ alignSelf: 'flex-start' }} >
					  <IconButton onClick={onEditMode} >
						{editMode
							? <EditOffIcon sx={{ fontSize: '36px' }} />
							: <EditIcon sx={{ fontSize: '36px' }} />
						}
					  </IconButton>
					  {editMode &&
						<IconButton onClick={onApply} >
						  <ApplyEditIcon sx={{ fontSize: '36px' }} />
						</IconButton>
					  }
					</Box>
				)}
			</Stack>
		</ChatContainer>
	);
}
