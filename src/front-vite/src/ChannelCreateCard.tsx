import React, { useState } from 'react';
import { useUser } from '../../Providers/UserContext/User';
import { useTheme } from 'styled-components';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Avatar,
  ButtonGroup,
  Button,
  TextField,
  FormControl,
  FormLabel,
  styled,
  IconButton,
} from '@mui/material';
import { ChannelType, useChannel } from './channels';

// Styled components
const CenteredCard = styled(Card)(({ theme }) => ({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: theme.spacing(1),
  maxWidth: 500,
  width: '100%',
  textAlign: 'center',
  boxShadow: theme.shadows[5],
  height: '50%',
  zIndex: 13000,
}));

const Overlay = styled(Box)(({ theme }) => ({
  position: 'fixed',
	top: 0,
	left: 0,
	width: '100%',
	height: '100%',
	bgcolor: 'rgba(0, 0, 0, 0.7)',
	zIndex: 12999,
}));

const CircleAvatar = styled(Avatar)(({ theme }) => ({
  width: 180,
  height: 180,
  margin: '0 auto',
  marginBottom: theme.spacing(3),
  border: '3px solid',
  borderColor: theme.palette.primary.dark,
}));

const CustomFormLabel = styled(FormLabel)(() => ({
  fontSize: '.9rem',
  fontWeight: 550,
}));

const ButtonBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  width: '90%',
  position: 'fixed',
  padding: theme.spacing(1),
  bottom: 0,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const TextFieldWrapper = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  textAlign: 'left',
}));

const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';
const AllChannelTypes: ChannelType[] = ['private', 'protected', 'public'];

const ChannelCreateCard = ({ setIsVisible }) => {
  const { user } = useUser();
	const { triggerRefresh } = useChannel();

  const initialChannelData = {
    name: `${user.nameNick || user.nameFirst}'s channel`,
    password: '',
    avatarSrc: 'https://via.placeholder.com/150',
    type: 'private',
  };
  const [channelData, setChannelData] = useState(initialChannelData);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const onTypeClick = (newType: ChannelType) => {
    setChannelData((prevData) => ({
      ...prevData,
      type: newType,
    }));
  };

  const generateButtonGroup = () => {
    return (
      <ButtonGroup fullWidth sx={{ mb: 2 }}>
        {Array.from({ length: 3 }, (_, index) => (
          <Button
		    key={index}
            variant={
              channelData.type === AllChannelTypes[index]
                ? 'contained'
                : 'outlined'
            }
            onClick={() => onTypeClick(AllChannelTypes[index])}
          >
            {AllChannelTypes[index]}
          </Button>
        ))}
      </ButtonGroup>
    );
  };

  const onCancel = () => {
    setIsVisible(false);
    setChannelData(initialChannelData);
  };

  const onCreate = async () => {
	setLoading(true);

	const payload = {
		name: channelData.name,
		type: channelData.type,
		password: channelData.type === 'protected' ? channelData.password : null
	}

	try {
		const response = await axios.post(`${BACKEND_URL}/channel/create`, payload, {
			withCredentials: true,
		});
		triggerRefresh();
		console.log(response.data);
	} catch(error) {
		setErrorMessage(`${error}, try again later`);
		console.error(error);
		setLoading(false);
		return;
	}
	setLoading(false);
	onCancel();
  };

  const onAvatarClick = () => {
    document.getElementById('avatar-upload')?.click();
  };

  const onImageUpload = (event) => {};

  return (
        <>
          <Overlay onClick={onCancel} />
          <CenteredCard>
            <CardContent>
              <Box
                onClick={onAvatarClick}
                sx={{ position: 'relative', display: 'inline-block', cursor: 'pointer', }}
              >
                <CircleAvatar src={channelData.avatarSrc} />
              </Box>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={onImageUpload}
              />

						  {generateButtonGroup()}

              <TextFieldWrapper>
                <FormControl fullWidth variant="outlined">
                  <CustomFormLabel>Channel Name</CustomFormLabel>
                  <TextField
                    variant="outlined"
                    value={channelData.name}
                    onChange={(event) => {
                      setChannelData((prevData) => ({
                        ...prevData,
                        name: event.target.value,
                      }));
                    }}
                    InputProps={{
                      style: {
                        padding: '4px 4px',
                        fontSize: '1rem',
                      },
                    }}
                    sx={{
                      height: '25px',
                      '& .MuiInputBase-input': {
                        padding: '2px 4px',
                      },
                    }}
                  />
                </FormControl>
              </TextFieldWrapper>

              {channelData.type === 'protected' && (<TextFieldWrapper>
                <FormControl fullWidth variant="outlined">
                  <CustomFormLabel>Channel Password</CustomFormLabel>
                  <TextField
                    variant="outlined"
                    type="password"
                    onChange={(event) => {
                      setChannelData((prevData) => ({
                        ...prevData,
                        password: event.target.value,
                      }));
                    }}
                    InputProps={{
                      style: {
                        padding: '4px 4px',
                        fontSize: '1rem',
                      },
                    }}
                    sx={{
                      height: '25px',
                      '& .MuiInputBase-input': {
                        padding: '2px 4px',
                      },
                    }}
                  />
                </FormControl>
              </TextFieldWrapper>)}

              <ButtonBar>
                <Button
                  onClick={onCancel}
                  sx={{ minWidth: 100, height: 40 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={onCreate}
                  sx={{ minWidth: 100, height: 40 }}
                >
                  Create
                </Button>
              </ButtonBar>
            </CardContent>
          </CenteredCard>
        </>
  );
};

export default ChannelCreateCard;

