import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Stack,
  Button,
  TextField,
  ButtonGroup,
  IconButton,
} from '@mui/material';
import {
  ChannelRole,
  ChannelStates,
  ChannelType,
  ChannelTypeValues,
  useChannel,
} from '../../../Providers/ChannelContext/Channel';
import {
  EditOff as EditOffIcon,
  Check as ApplyEditIcon,
} from '@mui/icons-material';
import {
  AvatarUploadIcon,
  ImageInput,
  UploadAvatar,
  DescriptionBox,
  lonelyBox,
} from '../Components/Components';
import { BACKEND_URL, getUsername, handleError, onFileUpload } from '../utils';
import { SettingsContainer, SettingsDivider, SettingsTextField } from '../Components/SettingsComponents';
import { ChannelDataType, SettingsBoxType } from './Types';
import { MemberCards } from './MemberCards';
import { SettingsUserCardBox } from '../Components/SettingsComponents';
import { BannedUserCards } from './BannedUserCards';

export const EditDetails: React.FC<SettingsBoxType> = ({ membership }) => {
	if (!membership) return (lonelyBox());

	const { changeProps } = useChannel();

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

  const [avatarSrc, setAvatarSrc] = useState(initialAvatarSrc);
  const [channelData, setChannelData] = useState(initialChannelData);

  const disableEditMode = () => {
    changeProps({ state: ChannelStates.details });
  };

  useEffect(() => {
    if (channelData !== initialChannelData || avatarSrc !== initialAvatarSrc) {
      reset();
    }
  }, [membership.id, membership.role]);

  useEffect(() => {
    if (!nameRef.current || !descriptionRef.current) return;

    nameRef.current.value = channel.name;
    descriptionRef.current.value = channel.description;
  }, []);

  const reset = () => {
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
        withCredentials: true,
      });
			disableEditMode();
			reset();
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
        direction={'row'}
        justifyContent={'center'}
        spacing={3}
        alignItems={'center'}
      >
        <UploadAvatar
          src={avatarSrc}
          avatarSx={{
            height: '7em',
            width: '7em',
          }}
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
          {isAdmin && (
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
    <SettingsContainer>
      <Stack direction={'row'} padding={0}>
        <Stack
          padding={2}
          spacing={3}
          alignItems="center"
          minWidth={'calc(100% - 48px)'}
        >
          {EditChannelDetail()}

          <SettingsDivider>Members</SettingsDivider>

          <SettingsUserCardBox>
            <Stack spacing={1}>
              <MemberCards
                channel={channel}
                members={members}
                editMode={true}
                isAdmin={isAdmin}
                isMod={true}
              />
            </Stack>
          </SettingsUserCardBox>

          {bannedUsers.length !== 0 && (
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

          {isAdmin && (
            <>
              <SettingsDivider>
                Hate this Channel?
              </SettingsDivider>

              <Box sx={{ marginTop: 3, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={onDelete}
                >
                  Delete Channel
                </Button>
              </Box>
            </>
          )}
        </Stack>

				<Box sx={{ alignSelf: 'flex-start' }}>
					<IconButton onClick={disableEditMode}>
							<EditOffIcon sx={{ fontSize: '36px' }} />
					</IconButton>
					<IconButton onClick={onApply}>
						<ApplyEditIcon sx={{ fontSize: '36px' }} />
					</IconButton>
				</Box>
      </Stack>
    </SettingsContainer>
  );
};
