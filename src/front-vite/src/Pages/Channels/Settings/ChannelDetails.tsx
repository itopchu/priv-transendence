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
} from '@mui/material';
import { useChannel } from '../../../Providers/ChannelContext/Channel';
import {
  AvatarUploadIcon,
  ImageInput,
  UploadAvatar,
  DescriptionBox,
  lonelyBox,
  CustomAvatar,
} from '../Components/Components';
import { BACKEND_URL, getUsername, handleError, onFileUpload } from '../utils';
import { SettingsDivider, SettingsTextField } from '../Components/SettingsComponents';
import { MemberCards } from './MemberCards';
import { SettingsUserCardBox } from '../Components/SettingsComponents';
import { BannedUserCards } from './BannedUserCards';
import { ChannelMember, ChannelRole, ChannelType, ChannelTypeValues } from '../../../Providers/ChannelContext/Types';
import { ChannelDetailsHeader } from '../Headers/ChannelDetailsHeader';

export type ChannelDataType = {
  image: File | undefined;
  type: ChannelType | undefined;
};

export interface SettingsBoxType {
  membership: ChannelMember | undefined;
};

export const ChannelDetails: React.FC<SettingsBoxType> = ({ membership }) => {
	if (!membership) return (lonelyBox());

	const	theme = useTheme()
	const isTinyScreen = useMediaQuery(theme.breakpoints.down('sm'));
	const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

	const { changeProps } = useChannel();
	const [editMode, setEditMode] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const channel = membership.channel;
	const bannedUsers = (channel?.bannedUsers ?? [])
    .sort((a, b) => getUsername(a).localeCompare(getUsername(b)))
  const members = channel.members
    .sort((a, b) => getUsername(a).localeCompare(getUsername(b)))
    .sort((a, b) => a.role - b.role);

  const initialAvatarSrc = channel.image;
  const initialChannelData: ChannelDataType = {
    type: undefined,
    image: undefined,
  };

  const isAdmin = membership.role === ChannelRole.admin;
  const isMod = membership.role < ChannelRole.member;

  const [avatarSrc, setAvatarSrc] = useState(initialAvatarSrc);
  const [channelData, setChannelData] = useState(initialChannelData);

  const toggleEditMode = () => {
		console.log('toggling');
    setEditMode(!editMode);
  };

  useEffect(() => {
		if (editMode && membership.role > ChannelRole.moderator) {
			setEditMode(false);
		}

    if (channelData !== initialChannelData || avatarSrc !== initialAvatarSrc) {
      reset();
    }
  }, [membership.id, membership.role]);

  useEffect(() => {
    if (!nameRef.current || !descriptionRef.current) return;

    nameRef.current.value = channel.name;
    descriptionRef.current.value = channel.description;
  }, [editMode]);

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
			reset();
    } catch (error) {
      handleError('Could not apply changes:', error);
    }
		toggleEditMode();
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

  const ChannelDetails = () => (
    <>
      <Stack
        direction={isTinyScreen ? 'column' : 'row'}
        justifyContent={'center'}
        spacing={3}
        alignItems={'center'}
      >
        <CustomAvatar
          src={channel.image}
          sx={{ height: '7em', width: '7em' }}
        />

        <Stack>
          <Typography variant="h5" fontWeight="bold">
            {channel.name}
          </Typography>

          <Typography
						alignSelf={isTinyScreen ? 'center' : undefined}
						variant="body1"
						color={'textSecondary'}
					>
            {`${channel.type} • ${members.length}\
							${members.length > 1 ? 'members' : 'member'}`}
          </Typography>
        </Stack>
      </Stack>

      <DescriptionBox sx={{ width: '65%',  minWidth: '20em' }}>
        <Typography
					sx={{
						wordBreak: 'break-word',
						whiteSpace: 'pre-wrap',
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
        direction={isTinyScreen ? 'column' : 'row'}
        justifyContent={'center'}
        spacing={3}
        alignItems={'center'}
      >
        <UploadAvatar
          src={avatarSrc}
          avatarSx={{ height: '7em', width: '7em' }}
        >
          <AvatarUploadIcon className="hidden-icon" />
          <ImageInput onFileInput={(file: File) => onFileUpload(file, changeChannelData, setAvatarSrc)} />
        </UploadAvatar>
        <Stack spacing={1}>
          <SettingsTextField
            inputRef={nameRef}
            variant="standard"
            placeholder={
              nameRef.current?.value.length
                ? undefined
                : 'Enter channel name...'
            }
          />
          {isAdmin
						? (
							<>
								{(channelData.type ? channelData.type : channel.type) === ChannelType.protected && (
									<SettingsTextField
										inputRef={passwordRef}
										variant="standard"
										placeholder={
											passwordRef.current?.value.length
												? undefined
												: 'Enter a password...'
										}
										type="password"
									/>
								)}
								{generateButtonGroup()}
							</>
          ) : (
						<Typography variant="body1" color={'textSecondary'}>
							{`${channel.type} • ${members.length}\
								${members.length > 1 ? 'members' : 'member'}`}
						</Typography>
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
          placeholder={
            descriptionRef.current?.value === ''
              ? undefined
              : 'Enter a description...'
          }
        />
      </DescriptionBox>
    </>
  );

  return (
		<Stack
			sx={{
				height: '80vh',
				bgcolor: theme.palette.primary.light,
				overflowX: 'hidden',
			}}
		>
			<ChannelDetailsHeader
				isMod={isMod}
				editMode={editMode}
				onEditClick={() => toggleEditMode()}
				onApplyClick={() => onApply()}
			/>
			<Stack direction={'row'}>
				<Stack
					flexGrow={1}
					paddingY={5}
					spacing={3}
					alignItems="center"
				>
					{editMode ? EditChannelDetail() : ChannelDetails()}

					<SettingsDivider>Members</SettingsDivider>

					<SettingsUserCardBox>
						<Stack spacing={1}>
							<MemberCards
								channel={channel}
								members={members}
								editMode={editMode}
								isAdmin={isAdmin}
								isMod={isMod}
							/>
						</Stack>
					</SettingsUserCardBox>

					{isAdmin && editMode && bannedUsers.length !== 0 && (
						<>
							<SettingsDivider>Banned Members</SettingsDivider>
							<SettingsUserCardBox>
								<Stack spacing={1}>
									<BannedUserCards
										users={bannedUsers}
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
				</Stack>
			</Stack>
		</Stack>
	);
};
