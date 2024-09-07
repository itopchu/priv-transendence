import React, { useRef, useState } from 'react';
import { useChannel } from './channels';
import { Channel } from './channels';
import axios from 'axios';
import { useUser } from '../../Providers/UserContext/User';
import {
  ButtonBar,
  CenteredCard,
  CustomFormLabel,
  LoadingCard,
  Overlay,
  TextFieldWrapper,
  DescriptionBox,
  CustomCardContent,
} from './CardComponents';
import {
  Button,
  CircularProgress,
  FormControl,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { SelectedType } from '.';
import { CustomAvatar } from './Components';

const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';

interface JoinCardType {
  setSelected: React.Dispatch<React.SetStateAction<SelectedType>>;
  channel: Channel;
}

export const JoinCard: React.FC<JoinCardType> = ({ setSelected, channel }) => {
  const { triggerRefresh, memberships } = useChannel();
  const { user, userSocket } = useUser();

  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const alreadyJoined = memberships.some((member) => member.channel.id === channel.id);
  const isBanned = false //channel?.banList.some((bannedUser) => bannedUser.id === user.id);
  const joinDisabled = alreadyJoined || isBanned;

  const onCancel = () => {
    setSelected((prev) => ({...prev, join: undefined}));
  };

  const onJoin = async () => {
    setLoading(true);

    const payload = {
      channelId: channel.id,
      password:
        channel.type === 'protected' ? passwordInputRef.current?.value : null,
    };

    try {
      const response = await axios.post(`${BACKEND_URL}/channel/join`, payload,
        {
          withCredentials: true,
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
      <CenteredCard sx={{ overflow: 'auto' }}>
        {loading ? (
          <LoadingCard>
            <CircularProgress size={80} />
          </LoadingCard>
        ) : (
          <CustomCardContent>
			<Stack spacing={1.6} alignItems={'center'} >
              <CustomAvatar
                sx={{ height: 170, width: 170 }}
                src={`${BACKEND_URL}/${channel.image}`}
              />

              <Typography fontSize={'large'}>{channel.name}</Typography>

              <DescriptionBox>
                <Typography sx={{ wordBreak: 'break-word', whiteSpace: 'pre' }}>
                  {channel.description}
                </Typography>
              </DescriptionBox>

              {channel.type === 'protected' && !joinDisabled && (
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
                          fontSize: '1.2rem',
                        },
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          padding: '2px 4px',
                        },
                      }}
                    />
                  </FormControl>
                </TextFieldWrapper>
              )}
			</Stack>

			<div style={{ flexGrow: 1 }} />

            {alreadyJoined && (
               <Typography variant="body2">
                 You are already in this channel
               </Typography>
            )}
            {isBanned && (
               <Typography variant="body2">
                 You are banned from this channel
               </Typography>
            )}

            <ButtonBar>
              <Button onClick={onCancel} sx={{ minWidth: 100, height: 40 }}>
                Cancel
              </Button>

              <Button
                variant="contained"
                onClick={onJoin}
                disabled={joinDisabled}
                sx={{
                  minWidth: 100,
                  height: 40,
                  backgroundColor: joinDisabled 
                    ? 'rgba(128, 128, 128, 0.5)'
                    : undefined,
                }}
              >
                Join
              </Button>
            </ButtonBar>
          </CustomCardContent>
        )}
      </CenteredCard>
    </>
  );
};
