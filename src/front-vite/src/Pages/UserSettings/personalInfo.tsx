import React from 'react';
import { TextField, Button, Avatar, Stack, useTheme } from '@mui/material';
import { useUser } from '../../Providers/UserContext/User';
import {
  Upload as UploadIcon
} from '@mui/icons-material';
import axios from 'axios';

export const PersonalInfo: React.FC = () => {
  const theme = useTheme();
  const { user, setUser } = useUser();
  const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost:4000';

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    const maxSizeInMB = 5;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      alert('File size exceeds 5MB. Please select a smaller file.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await axios.post(`${BACKEND_URL}/user/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });
      if (response.data.userClient)
        setUser(response.data.userClient);
    } catch (error) {
      alert('Failed to upload image. Please try again.');
    }
  };

  return (
    <>
      <Stack alignItems="center" direction="row" justifyContent="center">
        <Button
          component="label"
          sx={{
            aspectRatio: '1:1',
            borderRadius: '50%',
            padding: 0,
            '&:hover .image-profile': {
              filter: 'brightness(50%) blur(2px)',
            },
            '&:hover .upload-icon': {
              visibility: 'visible',
            },
            '.image-profile': {
              transition: 'filter 0.3s ease',
            },
          }}
        >
          <Avatar
            className="image-profile"
            sx={{
              width: '200px',
              height: '200px',
              aspectRatio: '1:1',
              border: user.image ? 'none' : '2px solid',
              borderColor: theme.palette.secondary.main,
            }}
            src={user.image || ''}
          />
          <UploadIcon
            className="upload-icon"
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: theme.palette.secondary.main,
              visibility: 'hidden',
              fontSize: '4em',
            }}
          />
          <input
            type="file"
            hidden
            accept="image/jpeg, image/png"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />
        </Button>
      </Stack>

      <TextField
        fullWidth
        label="First Name"
        variant="outlined"
        defaultValue={user.nameFirst}
        InputLabelProps={{
          style: { color: theme.palette.secondary.main },
        }}
        InputProps={{
          style: { color: 'gray' },
          readOnly: true,
        }}
        disabled
      />
      <TextField
        fullWidth
        label="Last Name"
        variant="outlined"
        defaultValue={user.nameLast}
        InputLabelProps={{
          style: { color: theme.palette.secondary.main },
        }}
        InputProps={{
          style: { color: 'gray' },
          readOnly: true,
        }}
        disabled
      />
    </>
  );
}

export default PersonalInfo;