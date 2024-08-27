import React, { useRef, useState } from 'react';
import { useChannel } from './channels';
import { Channel } from './channels';
import axios from 'axios';
import { useUser } from '../../Providers/UserContext/User';
import {
  ButtonBar,
  CenteredCard,
  CircleAvatar,
  CustomFormLabel,
  LoadingCard,
  Overlay,
  TextFieldWrapper,
} from './CardComponents';
import {
  Box,
  Button,
  CardContent,
  CircularProgress,
  FormControl,
  Stack,
  TextField,
  Typography,
  styled,
} from '@mui/material';

const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';

const DescriptionBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
  width: '100%',
  maxHeight: '6em',
  backgroundColor: theme.palette.primary.main,
  borderRadius: '1em',
  padding: theme.spacing(2),
  overflow: 'auto',
  boxShadow: theme.shadows[3],
}));

interface JoinCardType {
  setChannel: React.Dispatch<React.SetStateAction<number | undefined>>;
  channel: Channel;
}

export const JoinCard: React.FC<JoinCardType> = ({ setChannel, channel }) => {
  const { triggerRefresh, memberships } = useChannel();
  const { userSocket } = useUser();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const alreadyJoined = memberships.some((member) => member.channel.id === channel.id);

  const onCancel = () => {
    setChannel(undefined);
  };

  const onJoin = async () => {
    setLoading(true);

    const payload = {
      channelId: channel.id,
      password:
        channel.type === 'protected' ? passwordInputRef.current?.value : null,
    };

	console.log(payload);
    try {
      const response = await axios.post(`${BACKEND_URL}/channel/join`, payload,
        {
          withCredentials: true,
        }
      );
      triggerRefresh();
      userSocket?.emit('joinRoom', response.data.channel.id);
    } catch (error) {
      setErrorMessage(`${error}, try again later`);
      console.error(error);
      setLoading(false);
      return;
    }
    setLoading(false);
    onCancel();
  };

  return (
    <>
      <Overlay onClick={onCancel} />
      <CenteredCard sx={{ overflow: 'auto' }}>
        {loading ? (
          <LoadingCard>
            <CircularProgress size={80} />
          </LoadingCard>
        ) : (
          <CardContent>
            <Box
              sx={{
                position: 'relative',
                display: 'inline-block',
              }}
            >
              <CircleAvatar
                sx={{ height: 150, width: 150 }}
                src={channel?.image}
              />
            </Box>

            <Stack spacing={2}>
              <Typography fontSize={'large'}>{channel.name}</Typography>
              <DescriptionBox>
                <Typography sx={{ wordBreak: 'break-word' }}>
                  {'This can be a super duper long description of the channel'}
                </Typography>
              </DescriptionBox>

              {channel.type === 'protected' && !alreadyJoined && (
                <TextFieldWrapper>
                  <FormControl fullWidth variant="outlined">
                    <CustomFormLabel>Enter Password</CustomFormLabel>
                    <TextField
                      variant="outlined"
                      type="password"
                      inputRef={passwordInputRef}
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
              {alreadyJoined && (
                <Typography variant="body2">
                  You are already in this channel
                </Typography>
              )}
            </Stack>
            <ButtonBar>
              <Button onClick={onCancel} sx={{ minWidth: 100, height: 40 }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={onJoin}
                disabled={alreadyJoined}
                sx={{
                  minWidth: 100,
                  height: 40,
                  backgroundColor: alreadyJoined
                    ? 'rgba(128, 128, 128, 0.5)'
                    : undefined,
                }}
              >
                Join
              </Button>
            </ButtonBar>
          </CardContent>
        )}
      </CenteredCard>
    </>
  );
};
