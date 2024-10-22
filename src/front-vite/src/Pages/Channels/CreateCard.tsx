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
} from './Components/CardComponents';
import {
  ButtonGroup,
  Button,
  TextField,
  FormControl,
  CircularProgress,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { AvatarUploadIcon, ImageInput, PasswordTextField, UploadAvatar } from './Components/Components';
import { handleError, onFileUpload } from './utils';
import { MemberClient, ChannelStates, ChannelType, ChannelTypeValues } from '../../Providers/ChannelContext/Types';
import { useChannel } from '../../Providers/ChannelContext/Channel';
import { BACKEND_URL } from '../../Providers/UserContext/User';

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
	const theme = useTheme();
  const { user } = useUser();
	const { setChannelProps } = useChannel();
	const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const passwordRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const [channelData, setChannelData] = useState<ChannelDataType>(initialChannelData);
  const [creating, setCreating] = useState(false);
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
		if (creating) return;;
    setCreating(true);

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
			const { data: { membership } } = await axios.post<{ membership: MemberClient }>(
				`${BACKEND_URL}/channel/create`, payload,
				{ 
					withCredentials: true,
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				}
			);
			setChannelProps((prev) => ({
				...prev,
				selected: membership,
				state: ChannelStates.details,
			}));
    } catch (error: any) {
      handleError('Could not create channel: ', error);
      return;
    } finally {
			setCreating(false);
		}
    onCancel();
  };

  return (
    <>
      <CardOverlay onClick={onCancel} />
      <CenteredCard sx={{ width: isSmallScreen ? '25em' : '30em' }} >
				<CustomCardContent>
					<Stack spacing={2} justifyContent={'center'} alignItems={'center'}>
						<UploadAvatar
							variant='channel'
							src={avatarSrc}
							avatarSx={{ width: 170, height: 170 }}
						>
							<AvatarUploadIcon className="hidden-icon" sx={{ zIndex: 10 }} />
							<ImageInput onFileInput={(file: File) => onFileUpload(file, changeChannelData, setAvatarSrc)} />
						</UploadAvatar>
						{generateButtonGroup()}
						<TextFieldWrapper>
							<FormControl fullWidth variant="outlined">
								<CustomFormLabel>Channel Name</CustomFormLabel>
								<TextField
									variant='outlined'
									inputRef={nameRef}
									autoComplete='off'
									inputProps={{ maxLength: 30, }}
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
                {creating ? <CircularProgress color='secondary' size={40} /> : 'Create'}
              </Button>
            </ButtonBar>
				</CustomCardContent>
      </CenteredCard>
    </>
  );
};

export default CreateCard;
