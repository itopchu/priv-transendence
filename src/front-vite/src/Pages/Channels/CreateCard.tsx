import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '../../Providers/UserContext/User';
import { ChannelType, ChannelTypeValues, useChannel } from './channels';
import axios from 'axios';
import {
  CenteredCard,
  LoadingCard,
  Overlay,
  TextFieldWrapper,
  CustomFormLabel,
  ButtonBar,
  CustomCardContent,
} from './CardComponents';
import {
  ButtonGroup,
  Button,
  TextField,
  FormControl,
  CircularProgress,
  Stack,
} from '@mui/material';
import { ButtonAvatar, AvatarUploadIcon, ImageInput, UploadAvatar } from './Components';
import { validateFile } from './settings';

const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';

interface CreateCardType {
  setIsVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

type ChannelDataType = {
  image: File | undefined;
  type: ChannelType;
}

const initialChannelData: ChannelDataType = {
  image: undefined,
  type: ChannelType.private,
};

const CreateCard: React.FC<CreateCardType> = ({ setIsVisible }) => {
  const { user, userSocket } = useUser();
  const { triggerRefresh } = useChannel();
  const passwordRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const [channelData, setChannelData] = useState<ChannelDataType>(initialChannelData);
  const [loading, setLoading] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState('');

  useEffect(() => {
	if (nameRef.current) {
		nameRef.current.value = `${user.nameNick || user.nameFirst}'s Channel`;
	}
  }, []);

  const changeChannelData = (newData: Partial<ChannelDataType>) => {
    setChannelData((prevData) => ({
      ...prevData,
      ...newData,
    }));
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

  const onCancel = () => {
    setIsVisible(false);
  };

  const onCreate = async () => {
    setLoading(true);

    const payload = new FormData();
	payload.append('type', channelData.type);
	if (channelData.image) {
		payload.append('image', channelData.image);
	}
	if (channelData.type === 'protected' && passwordRef.current?.value) {
		payload.append('password', passwordRef.current?.value);
	}
	if  (nameRef.current) {
		payload.append('name', nameRef.current?.value);
	}

    try {
      const response = await axios.post(`${BACKEND_URL}/channel/create`, payload, {
          withCredentials: true,
		  headers: {
		    'Content-Type': 'multipart/form-data',
		  },
        }
      );
      triggerRefresh();
      userSocket?.emit('joinRoom', response.data.channel.id);
    } catch (error: any) {
      alert(error?.response?.data?.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    onCancel();
  };

  return (
    <>
      <Overlay onClick={onCancel} />
      <CenteredCard sx={{ display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <LoadingCard>
            <CircularProgress size={80} />
          </LoadingCard>
        ) : (
		<CustomCardContent>
          <Stack spacing={2}>
			<UploadAvatar
				src={avatarSrc}
				avatarSx={{ width: 170, height: 170 }}
				sx={{ alignSelf: 'center' }}
			>
			  <AvatarUploadIcon className="hidden-icon" />
			  <ImageInput onFileInput={onFileUpload} />
			</UploadAvatar>

            {generateButtonGroup()}

            <TextFieldWrapper>
              <FormControl fullWidth variant="outlined">
                <CustomFormLabel>Channel Name</CustomFormLabel>
                <TextField
                  variant="outlined"
				  inputRef={nameRef}
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

            {channelData.type === 'protected' && (
              <TextFieldWrapper>
                <FormControl fullWidth variant="outlined">
                  <CustomFormLabel>Channel Password</CustomFormLabel>
                  <TextField
					inputRef={passwordRef}
                    variant="outlined"
                    type="password"
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
            )}
          </Stack>

            <ButtonBar>
              <Button onClick={onCancel} sx={{ minWidth: 100, height: 40 }}>
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
		</CustomCardContent>
        )}
      </CenteredCard>
    </>
  );
};

export default CreateCard;

