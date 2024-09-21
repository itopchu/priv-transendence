import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '../../Providers/UserContext/User';
import axios from 'axios';
import {
  CenteredCard,
  Overlay,
  TextFieldWrapper,
  CustomFormLabel,
  ButtonBar,
  CustomCardContent,
  LoadingBox,
} from './Components/CardComponents';
import {
  ButtonGroup,
  Button,
  TextField,
  FormControl,
  CircularProgress,
  Stack,
} from '@mui/material';
import { AvatarUploadIcon, ImageInput, UploadAvatar } from './Components/Components';
import { ChannelType, ChannelTypeValues } from '../../Providers/ChannelContext/Channel';
import { BACKEND_URL, handleError, onFileUpload, retryOperation } from './utils';

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
  const { user } = useUser();
  const passwordRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const [channelData, setChannelData] = useState<ChannelDataType>(initialChannelData);
  const [loading, setLoading] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(undefined);

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
		if (channelData.type === 'protected' && passwordRef.current) {
			payload.append('password', passwordRef.current.value);
		}
		if  (nameRef.current) {
			payload.append('name', nameRef.current.value);
		}

    try {
			await retryOperation(async () => {
				const response = await axios.post(`${BACKEND_URL}/channel/create`, payload, {
					withCredentials: true,
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				});
				return (response.data.channel);
			});
    } catch (error: any) {
      setLoading(false);
      handleError('Could not create channel: ', error);
      return;
    }
    setLoading(false);
    onCancel();
  };

  return (
    <>
      <Overlay onClick={onCancel} />
      <CenteredCard sx={{ display: 'flex', flexDirection: 'column' }}>
        {loading &&
					<LoadingBox>
						<CircularProgress size={80} />
					</LoadingBox>
				}
				<CustomCardContent 
					sx={{
						visibility: loading ? 'hidden' : 'visible',
					}}
				>
				<Stack spacing={2}>
					<UploadAvatar
						src={avatarSrc}
						avatarSx={{ width: 170, height: 170 }}
						sx={{ alignSelf: 'center' }}
					>
						<AvatarUploadIcon className="hidden-icon" />
						<ImageInput onFileInput={(file: File) => onFileUpload(file, changeChannelData, setAvatarSrc)} />
					</UploadAvatar>
						{!loading && generateButtonGroup()}

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
      </CenteredCard>
    </>
  );
};

export default CreateCard;
