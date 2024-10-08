import React, { useRef, useState } from 'react';
import { useChannel } from '../../Providers/ChannelContext/Channel';
import axios from 'axios';
import { useUser } from '../../Providers/UserContext/User';
import {
  ButtonBar,
  CenteredCard,
  CustomFormLabel,
  CardOverlay,
  TextFieldWrapper,
  CustomCardContent,
  CardLoadingBox,
} from './Components/CardComponents';
import {
  Button,
  CircularProgress,
  FormControl,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CustomAvatar, DescriptionBox } from './Components/Components';
import { BACKEND_URL, handleError } from './utils';
import { Channel, ChannelMember, ChannelStates } from '../../Providers/ChannelContext/Types';
import { retryOperation } from '../../Providers/ChannelContext/utils';

interface JoinCardType {
  channel: Channel | undefined;
}

export const JoinCard: React.FC<JoinCardType> = ({ channel }) => {
	if (!channel) return (null);

  const { channelProps, changeProps, setChannelProps } = useChannel();
  const { user } = useUser();

  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const alreadyJoined = channelProps.memberships.some((member) => member.channel.id === channel.id);
	console.log(channel);
  const isBanned = channel.bannedUsers
		? channel.bannedUsers.some((bannedUser) => bannedUser.id === user.id)
		: false;
  const joinDisabled = alreadyJoined || isBanned;

  const onCancel = () => {
    changeProps({ selectedJoin: undefined });
  };

  const onJoin = async () => {
    setLoading(true);

    const payload = {
      password:
        channel.type === 'protected' ? passwordInputRef.current?.value : null,
    };

    try {
			const membership: ChannelMember = await retryOperation(async () =>{
				const response = await axios.post(
					`${BACKEND_URL}/channel/join/${channel.id}`,
					payload,
					{
						withCredentials: true,
					}
				);
				return (response.data.membership);
			})
			setChannelProps((prev) => ({
				...prev,
				selected: prev.selected ? prev.selected : membership,
				state: prev.selected ? prev.state : ChannelStates.chat,
			}));
    } catch (error: any) {
	  handleError('Could not join channel: ', error);
      setLoading(false);
      return;
    }
    setLoading(false);
    onCancel();
  };

  return (
    <>
      <CardOverlay onClick={onCancel} />
      <CenteredCard sx={{ overflow: 'auto' }}>
				<CardLoadingBox>
					<CircularProgress sx={{ size: 80, display: loading ? 'flex' : 'none' }}/>
				</CardLoadingBox>
				<CustomCardContent sx={{ display: loading ? 'none' : 'flex' }}>
					<Stack spacing={1.6} alignItems={'center'} >
						<CustomAvatar
							sx={{ height: 170, width: 170 }}
							src={channel.image}
						/>

						<Typography fontSize={'large'}>{channel.name}</Typography>

						<DescriptionBox sx={{ overflow: 'hidden' }}>
							<Typography
								sx={{
									display: '-webkit-box',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									WebkitLineClamp: 4,
									WebkitBoxOrient: 'vertical',
									wordBreak: 'break-word',
									whiteSpace: 'pre-wrap'
								}}>
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
      </CenteredCard>
    </>
  );
};
