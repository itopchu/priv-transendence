import React, { useState } from 'react';
import { Container, Badge, Typography, TextField, Button, Box, Avatar, Switch, FormControlLabel, useMediaQuery, Stack, Divider, useTheme, lighten, alpha } from '@mui/material';
import { useUser } from '../../Providers/UserContext/User';
import {
  Upload as UploadIcon
} from '@mui/icons-material';

export const PersonalInfo: React.FC = () => {
  const theme = useTheme();
  const { user } = useUser();

  return (
    <>
      <Stack alignItems="center" direction="row" justifyContent="center">
        <Button
          component="label"
          sx={{
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
              width: '100%',
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
            onChange={(e) => {
              // handleFileSelect(e.target.files[0]);
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