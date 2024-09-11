import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { UserCards } from './userCard';
import {
  Box,
  Divider,
  Stack,
  styled,
  Typography,
  IconButton,
  Button,
  TextField,
  ButtonGroup,
} from '@mui/material';
import {
  ChannelMember,
  ChannelRole,
  ChannelType,
  ChannelTypeValues,
} from '../../../Providers/ChannelContext/Channel';
import {
  ModeEdit as EditIcon,
  EditOff as EditOffIcon,
  Check as ApplyEditIcon,
} from '@mui/icons-material';
import {
  CustomAvatar,
  AvatarUploadIcon,
  ImageInput,
  UploadAvatar,
  CustomScrollBox,
  DescriptionBox,
} from '../Components/Components';
import { SelectedType } from '..';
import { BACKEND_URL, getUsername, handleError, validateFile } from '../utils';

type ChannelDataType = {
  image: File | undefined;
  type: ChannelType | undefined;
};

const SettingsTextField = styled(TextField)(() => ({
  '& .MuiInputBase-input': {
    padding: '0px 4px',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    lineheight: 1.334,
    letterspacing: '0em',
  },
}));

const SettingsContainer = styled(CustomScrollBox)(({ theme }) => ({
  position: 'relative',
  height: '80vh',
  backgroundColor: theme.palette.primary.light,
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(2),
}));

const SettingsDivider = styled(Divider)(() => ({
  width: '70%',
  '&::before, &::after': {
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

export const SettingsBox: React.FC<SettingsBoxType> = ({ membership, setSelected, }) => {
  const passwordRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const channel = membership.channel;
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

  const [editMode, setEditMode] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(initialAvatarSrc);
  const [channelData, setChannelData] = useState(initialChannelData);

  useEffect(() => {
    if (editMode) {
      setEditMode(false);
      console.log('should be false');
    }
    if (channelData !== initialChannelData || avatarSrc !== initialAvatarSrc) {
      reset();
    }
  }, [membership.id, membership.role]);

  useEffect(() => {
    if (!editMode || !nameRef.current || !descriptionRef.current) return;

    nameRef.current.value = channel.name;
    descriptionRef.current.value = channel.description;
  }, [editMode]);

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
      setEditMode(!editMode);
      reset();
    } catch (error) {
      handleError('Could not apply changes:', error);
    }
  };

  const onEditMode = () => {
    setEditMode(!editMode);

    if (editMode) {
      reset();
    }
  };

  const onDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${channel.name}?`)) return;

    try {
      await axios.delete(`${BACKEND_URL}/channel/${channel.id}`, {
        withCredentials: true,
      });
      setSelected((prev) => ({
        ...prev,
        settings: undefined,
      }));
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
      setSelected((prev) => ({
        ...prev,
        settings: undefined,
      }));
    } catch (error) {
      handleError('Could not leave channel:', error);
    }
  };

  const onFileUpload = (file: File) => {
    if (!validateFile(file)) return;

    changeChannelData({ image: file });
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarSrc(reader?.result as string);
    };
    reader.readAsDataURL(file);
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
          <ImageInput onFileInput={onFileUpload} />
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

  const ChannelDetails = () => (
    <>
      <Stack
        direction={'row'}
        justifyContent={'center'}
        spacing={3}
        alignItems={'center'}
      >
        <CustomAvatar
          src={channel.image}
          sx={{
            height: '7em',
            width: '7em',
          }}
        />

        <Stack>
          <Typography variant="h5" fontWeight="bold">
            {channel.name}
          </Typography>

          <Typography variant="body1" color={'textSecondary'}>
            {`${channel.type} • ${members.length}\
				${members.length > 1 ? 'members' : 'member'}`}
          </Typography>
        </Stack>
      </Stack>

      <DescriptionBox sx={{ width: '65%' }}>
        <Typography sx={{ wordBreak: 'break-word', whiteSpace: 'pre' }}>
          {channel.description}
        </Typography>
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
          {editMode ? EditChannelDetail() : ChannelDetails()}

          <SettingsDivider>Members</SettingsDivider>

          <Box
            sx={{
              maxHeight: '30em',
              minWidth: '65%',
              overflowY: 'auto',
              '&::-webkit-scrollbar': { width: '0px' },
            }}
          >
            <Stack spacing={1}>
              <UserCards
                channel={channel}
                members={members}
                editMode={editMode}
                isAdmin={isAdmin}
                isMod={isMod}
              />
            </Stack>
          </Box>

          {(!editMode || isAdmin) && (
            <>
              <SettingsDivider>
                {editMode ? 'Hate this Channel?' : 'Leaving?'}
              </SettingsDivider>

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
          <Box sx={{ alignSelf: 'flex-start' }}>
            <IconButton onClick={onEditMode}>
              {editMode ? (
                <EditOffIcon sx={{ fontSize: '36px' }} />
              ) : (
                <EditIcon sx={{ fontSize: '36px' }} />
              )}
            </IconButton>
            {editMode && (
              <IconButton onClick={onApply}>
                <ApplyEditIcon sx={{ fontSize: '36px' }} />
              </IconButton>
            )}
          </Box>
        )}
      </Stack>
    </SettingsContainer>
  );
};
