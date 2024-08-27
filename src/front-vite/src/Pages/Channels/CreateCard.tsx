import React, { useState } from 'react';
import { useUser } from '../../Providers/UserContext/User';
import { ChannelType, useChannel } from './channels';
import { useTheme } from 'styled-components';
import axios from 'axios';
import {
	CenteredCard,
	LoadingCard,
	Overlay,
	CircleAvatar,
    TextFieldWrapper,
    CustomFormLabel,
    ButtonBar,
} from './CardComponents'
import {
  Box,
  CardContent,
  ButtonGroup,
  Button,
  TextField,
  FormControl,
  CircularProgress,
} from '@mui/material';

const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';
const AllChannelTypes: ChannelType[] = ['private', 'protected', 'public'];

interface CreateCardType {
  setIsVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

const CreateCard: React.FC<CreateCardType> = ({ setIsVisible }) => {
  const { user, userSocket } = useUser();
  const { triggerRefresh } = useChannel();

  const initialChannelData = {
    name: `${user.nameNick || user.nameFirst}'s channel`,
    password: '',
    avatarSrc: '',
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
		userSocket?.emit('joinRoom', response.data.channel.id);
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
					{loading ? (<LoadingCard> <CircularProgress size={80} /> </LoadingCard>) :
            (<CardContent>
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
            </CardContent>)}
          </CenteredCard>
        </>
  );
};

export default CreateCard;

