import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '../../Providers/UserContext/User';
import axios from 'axios';
import {
  CenteredCard,
  CardOverlay,
  TextFieldWrapper,
  CustomFormLabel,
  ButtonBar,
  CustomCardContent,
  CardLoadingBox,
} from './Components/CardComponents';
import {
  ButtonGroup,
  Button,
  TextField,
  FormControl,
  CircularProgress,
  Stack,
} from '@mui/material';
import { PeopleRounded as DefaultChannelIcon } from '@mui/icons-material';
import { AvatarUploadIcon, ImageInput, PasswordTextField, UploadAvatar } from './Components/Components';
import { BACKEND_URL, handleError, onFileUpload } from './utils';
import { Channel, ChannelMember, ChannelStates, ChannelType, ChannelTypeValues } from '../../Providers/ChannelContext/Types';
import { retryOperation } from '../../Providers/ChannelContext/utils';
import { useChannel } from '../../Providers/ChannelContext/Channel';

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
	const { setChannelProps } = useChannel();
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
			const membership: ChannelMember = await retryOperation(async () => {
				const response = await axios.post(`${BACKEND_URL}/channel/create`, payload, {
					withCredentials: true,
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				});
				return (response.data.membership);
			});
			setChannelProps((prev) => ({
				...prev,
				selected: prev.selected ? prev.selected : membership,
				state: prev.selected ? prev.state : ChannelStates.details,
			}));
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
      <CardOverlay onClick={onCancel} />
      <CenteredCard>
        {loading &&
					<CardLoadingBox>
						<CircularProgress size={80} />
					</CardLoadingBox>
				}
				<CustomCardContent 
					sx={{
						visibility: loading ? 'hidden' : 'visible',
					}}
				>
				<Stack spacing={2} justifyContent={'center'} alignItems={'center'}>
					<UploadAvatar
						src={avatarSrc}
						avatarSx={{ width: 170, height: 170 }}
						defaultIcon={<DefaultChannelIcon sx={{ width: 120, height: 120 }} />}
					>
						<AvatarUploadIcon className="hidden-icon" sx={{ zIndex: 10 }} />
						<ImageInput onFileInput={(file: File) => onFileUpload(file, changeChannelData, setAvatarSrc)} />
					</UploadAvatar>
						{!loading && generateButtonGroup()}

							<TextFieldWrapper>
								<FormControl fullWidth variant="outlined">
									<CustomFormLabel>Channel Name</CustomFormLabel>
									<TextField
										variant='outlined'
										inputRef={nameRef}
										autoComplete='off'
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
										<PasswordTextField
											ref={passwordRef}
											variant='outlined'
											style={{
												padding: '4px 4px',
												fontSize: '1rem',
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
