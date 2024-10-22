import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Stack,
  Button,
  TextField,
  ButtonGroup,
  Typography,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import { useChannel } from '../../../Providers/ChannelContext/Channel';
import {
  AvatarUploadIcon,
  ImageInput,
  UploadAvatar,
  DescriptionBox,
  PasswordTextField,
  LoadingBox,
  CustomAvatar,
  scrollStyleSx,
} from '../Components/Components';
import { formatErrorMessage, getUsername, handleError, onFileUpload } from '../utils';
import { SettingsDivider, SettingsTextFieldSx, SettingsUserCardBox } from '../Components/SettingsComponents';
import { MemberCards } from './MemberCards';
import { BannedUserCards } from './BannedUserCards';
import { MemberPublic, ChannelRole, ChannelType, ChannelTypeValues, DataUpdateType, MemberClient } from '../../../Providers/ChannelContext/Types';
import ChannelDetailsHeader from '../Headers/ChannelDetailsHeader';
import { UserPublic, useUser } from '../../../Providers/UserContext/User';
import { updatePropArray } from '../../../Providers/ChannelContext/utils';
import { StatusTypography } from '../Components/ChatBoxComponents';
import { BACKEND_URL } from '../../../Providers/UserContext/User';

export type ChannelDataType = {
  image: File | undefined;
  type: ChannelType | undefined;
};

export const ChannelDetails: React.FC<{membership: MemberClient}> = (
	{ membership }
) => {
	const	theme = useTheme()
	const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

	const { userSocket } =  useUser();
	const { changeProps } = useChannel();
	const [editMode, setEditMode] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const channel = membership.channel;
  const isAdmin = membership.role === ChannelRole.admin;
  const isMod = membership.role <= ChannelRole.moderator;
  const initialAvatarSrc = channel?.image;
  const initialChannelData: ChannelDataType = {
    type: undefined,
    image: undefined,
  };

	const [members, setMembers] = useState<MemberPublic[]>([]);
	const [banList, setBanList] = useState<UserPublic[]>([]);
	const [membersLoading, setMembersLoading] = useState(true);
	const [banListLoading, setBanListLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [avatarSrc, setAvatarSrc] = useState(initialAvatarSrc);
  const [channelData, setChannelData] = useState(initialChannelData);

	useEffect(() => {
		const controller = new AbortController();

		const getMembers = async () => {
			try {
				const { data: { members } } = await axios.get<{ members: MemberPublic[] }>(
					`${BACKEND_URL}/channel/${channel.id}/members`,
					{
						withCredentials: true,
						signal: controller.signal,
					},
				);
				if (members) {
					members.sort((a, b) => {
						const roleDiff = a.role - b.role;
						if (!roleDiff) {
							return (getUsername(a).localeCompare(getUsername(b)));
						}
						return (roleDiff);
					});
					setMembers(members);
					setErrorMsg(null);
				} else {
					setErrorMsg('No members received');
				}
			} catch (error) {
				if (!axios.isCancel(error)) {
					setErrorMsg(formatErrorMessage(error));
				}
			}
		}

		getMembers();
		return () => {
			controller.abort();
			setErrorMsg(null);
			setMembersLoading(true);
			setMembers([]);
		};
	}, [channel.id]);

	useEffect(() => {
    if (editMode && nameRef.current && descriptionRef.current) {
			reset();
		};

		if (!editMode || !membership) return;

		const controller = new AbortController();

		const getBanList = async () => {
			try {
				const { data: { users } } = await axios.get<{ users: UserPublic[] }>(
					`${BACKEND_URL}/channel/${channel.id}/banned`,
					{
						withCredentials: true,
						signal: controller.signal,
					},
				);
				if (users) {
					users.sort((a, b) => getUsername(a).localeCompare(getUsername(b)));
					setBanList(users);
				}
			} catch (error) {
				// do someethhiing
			} finally {
				setBanListLoading(false);
			}
		}

		const handleBanListUpdate = (data: DataUpdateType<UserPublic>) => {
			setBanList((prevBanList) => updatePropArray(prevBanList, data));
		}

		if (!banList?.length) {
			getBanList();
		}

		const event = `channel${channel.id}BanListUpdate`;
		userSocket?.on(event, handleBanListUpdate);
		return () => {
			controller.abort();
			userSocket?.off(event, handleBanListUpdate);
			setBanListLoading(true);
			setBanList([]);
		};
	}, [channel.id, editMode, userSocket]);

	useEffect(() => {
		if (!userSocket) return;

		const handleMemberUpdate = (data: DataUpdateType<MemberPublic>) => {
			if (data.id === channel.id) {
				setMembers((prevMembers) => updatePropArray(prevMembers, data));
			}
		}

		const event = 'channelMemberUpdate';
		userSocket?.on(event, handleMemberUpdate);
		return () => {
			userSocket?.off(event, handleMemberUpdate);
		};
	}, [channel.id, userSocket]);

  useEffect(() => {
		if (editMode && !isMod) {
			setEditMode(false);
		}

    if (channelData !== initialChannelData || avatarSrc !== initialAvatarSrc) {
      reset();
    }
  }, [membership.id, isMod]);

	useEffect(() => {
		if (!members.length && !errorMsg) return;

		setMembersLoading(false);
	}, [members]);

  function toggleEditMode() {
    setEditMode(!editMode);
  };

  const reset = () => {
		if (nameRef.current && descriptionRef.current) {
			nameRef.current.value = channel.name;
			descriptionRef.current.value = channel.description;
		}
    setAvatarSrc(initialAvatarSrc);
    setChannelData(initialChannelData);
  };

  const changeChannelData = (newData: Partial<ChannelDataType>) => {
    setChannelData((prevData) => ({
      ...prevData,
      ...newData,
    }));
  };

  const onApply = async () => {
    const cleanName = nameRef.current?.value;
    const password = passwordRef.current?.value;
    const description = descriptionRef.current?.value;

    const payload = new FormData();
    if (channelData.type && channelData.type !== channel.type) {
      payload.append('type', channelData.type);
    }
    if (channelData.image) {
      payload.append('image', channelData.image);
    }
    if (cleanName && cleanName !== channel.name) {
      payload.append('name', cleanName);
    }
    if (channelData.type === 'protected' && password) {
      payload.append('password', password);
    }
    if (description && description !== channel.description) {
      payload.append('description', description);
    }
    try {
      await axios.patch(`${BACKEND_URL}/channel/${channel.id}`, payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });
			toggleEditMode();
    } catch (error) {
      handleError('Could not apply changes:', error);
    }
  };

  const onDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${channel.name}?`)) return;

    try {
      await axios.delete(`${BACKEND_URL}/channel/${channel.id}`, {
        withCredentials: true,
      });
      changeProps({ selected: undefined, state: undefined });
    } catch (error) {
      handleError('Could not delete channel:', error);
    }
  };

	const onLeave = async () => {
    if (!confirm(`Are you sure you want to leave ${channel.name}?`)) return;

    try {
      await axios.delete(`${BACKEND_URL}/channel/leave/${membership.id}`, {
        withCredentials: true,
      });
      changeProps({ selected: undefined, state: undefined });
    } catch (error) {
      handleError('Could not leave channel:', error);
    }
  };

	const ChannelStatus = () => (
		<Typography
			alignSelf={isSmallScreen ? 'center' : undefined}
			variant="body1"
			color={'textSecondary'}
			sx={{ cursor: 'default' }}
		>
			{`${channel.type} • ${channel.memberCount || '1'}\
				${(channel.memberCount || 1) > 1 ? 'members' : 'member'}`}
		</Typography>
	);

  const ChannelDetails = () => (
    <>
      <Stack
        direction={isSmallScreen ? 'column' : 'row'}
        justifyContent={'center'}
        spacing={3}
        alignItems={'center'}
      >
        <CustomAvatar
					variant='channel'
          src={channel.image}
          sx={{ height: '7em', width: '7em' }}
        />
        <Stack>
          <Typography
						variant="h5"
						fontWeight="bold"
						sx={{ textAlign: isSmallScreen ? 'center' : 'left' }}
					>
            {channel.name}
          </Typography>
          <ChannelStatus />
        </Stack>
      </Stack>
      <DescriptionBox 
				sx={{
					width: '65%',
					minWidth: '20em',
					overflow: 'hidden',
				}}
			>
        <Typography
					sx={{
						overflowY: 'auto',
						wordBreak: 'break-word',
						whiteSpace: 'pre-wrap',
						maxHeight: '100%',
						width: '100%',
						'&::-webkit-scrollbar-track': {
							display: 'none',
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
								backgroundColor: theme.palette.primary.dark,
							},
						}
					}}
				>
          {channel.description}
        </Typography>
      </DescriptionBox>
    </>
  );

  const generateButtonGroup = () => (
    <ButtonGroup fullWidth sx={{ mb: 2 }}>
      {Array.from({ length: 3 }, (_, index) => (
        <Button
          key={index}
          variant={
            (channelData.type ? channelData.type : channel.type) === ChannelTypeValues[index]
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

  const EditChannelDetail = () => (
    <>
      <Stack
        direction={isSmallScreen ? 'column' : 'row'}
        justifyContent={'center'}
        spacing={3}
        alignItems={'center'}
      >
        <UploadAvatar
          src={avatarSrc}
          avatarSx={{ height: '7em', width: '7em' }}
					variant='channel'
        >
          <AvatarUploadIcon className="hidden-icon" />
          <ImageInput onFileInput={(file: File) => onFileUpload(file, changeChannelData, setAvatarSrc)} />
        </UploadAvatar>
        <Stack spacing={1}>
          <TextField
            inputRef={nameRef}
            variant="standard"
						inputProps={{ maxLength: 30, }}
						sx={SettingsTextFieldSx(theme)}
            placeholder={'Enter channel name...'}
          />
          {isAdmin
						? (
							<>
								{(channelData.type ? channelData.type : channel.type) === ChannelType.protected && (
									<PasswordTextField
										ref={passwordRef}
										sx={SettingsTextFieldSx(theme)}
										variant="standard"
									/>
								)}
								{generateButtonGroup()}
							</>
          ) : (
						<ChannelStatus />
					)}
        </Stack>
      </Stack>
      <DescriptionBox sx={{ width: '65%' }}>
        <TextField
          inputRef={descriptionRef}
          variant="standard"
          fullWidth
          multiline
          maxRows={4}
					sx={{
						flexGrow: 1,
						'& .MuiInputBase-input': {
							'&::-webkit-scrollbar-track': {
								display: 'none',
							},
							'&::-webkit-scrollbar': {
								width: '4px',
							},
							'&::-webkit-scrollbar-thumb': {
								backgroundColor: theme.palette.primary.dark,
								borderRadius: '1em',
							},
						},
						'& textarea': {
							textAlign: 'center',
						},
					}}
					inputProps={{ maxLength: 100, }}
          placeholder={'Enter a description...'}
        />
      </DescriptionBox>
    </>
  );

  return (
		<Stack
			sx={{
				height: '80vh',
				bgcolor: theme.palette.primary.light,
				overflowY: 'auto',
				overflowX: 'hidden',
				'&::-webkit-scrollbar': {
					display: 'none',
				},
			}}
		>
			<ChannelDetailsHeader
				isMod={isMod}
				editMode={editMode}
				onEditClick={() => toggleEditMode()}
				onApplyClick={() => onApply()}
			/>
			{membersLoading && (
				<LoadingBox>
					<CircularProgress size={80} />
				</LoadingBox>
			)}
			<Stack display={membersLoading ? 'none' : 'flex'} >
				<Stack
					flexGrow={1}
					paddingY={5}
					spacing={3}
					alignItems="center"
				>
					{editMode ? EditChannelDetail() : ChannelDetails()}

					<SettingsDivider>Members</SettingsDivider>

					<SettingsUserCardBox
						sx={{
							...scrollStyleSx,
							'&:hover': {
								'&::-webkit-scrollbar-thumb': {
									backgroundColor: theme.palette.primary.dark,
								},
							}
						}}
					>
						{membersLoading && (
							<LoadingBox>
								<CircularProgress />
							</LoadingBox>
						)}
						<StatusTypography
							hidden={!errorMsg}
							sx={{
								color: theme.palette.error.main,
							}}
						>
							{errorMsg}
						</StatusTypography>
						<Stack spacing={1} display={membersLoading ? 'none' : 'flex'}>
							<MemberCards
								channel={channel}
								members={members}
								editMode={editMode}
								isAdmin={isAdmin}
								isMod={isMod}
							/>
						</Stack>
					</SettingsUserCardBox>

					{editMode && banList.length !== 0 && (
						<>
							<SettingsDivider>Banned Users</SettingsDivider>
							<SettingsUserCardBox
								sx={{
									...scrollStyleSx,
									'&:hover': {
										'&::-webkit-scrollbar-thumb': {
											backgroundColor: theme.palette.primary.dark,
										},
									}
								}}
							>
								<Stack spacing={1}>
									<BannedUserCards
										users={banList}
										channelId={channel.id}
									/>
								</Stack>
							</SettingsUserCardBox>
						</>
					)}

					<SettingsDivider>
						{editMode && isAdmin ? 'Hate this channel?' : 'Leaving?'}
					</SettingsDivider>

					<Box sx={{ marginTop: 3, textAlign: 'center' }}>
						<Button
							variant="contained"
							color="error"
							onClick={editMode && isAdmin ? onDelete : onLeave}
						>
							{`${editMode && isAdmin ? 'Delete' : 'Leave'} Channel`}
						</Button>
					</Box>

					{editMode && banListLoading && (
						<LoadingBox>
							<CircularProgress size={50} />
						</LoadingBox>
					)}
				</Stack>
			</Stack>
		</Stack>
	);
};
