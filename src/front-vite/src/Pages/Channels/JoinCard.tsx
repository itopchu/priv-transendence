import React, { useEffect, useRef, useState } from 'react';
import { useChannel } from '../../Providers/ChannelContext/Channel';
import axios from 'axios';
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
import { formatErrorMessage, handleError } from './utils';
import { MemberClient, ChannelPublic, ChannelStates, ChannelType, DataUpdateType, UpdateType } from '../../Providers/ChannelContext/Types';
import { retryOperation } from '../../Providers/ChannelContext/utils';
import { useUser } from '../../Providers/UserContext/User';
import { BACKEND_URL } from '../../Providers/UserContext/User';

export const JoinCard: React.FC = () => {
  const { channelProps, changeProps, setChannelProps } = useChannel();
	const { userSocket } = useUser();

  const [channel, setChannel] = useState<ChannelPublic | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

	if (!channelProps.selectedJoin) return (null);

	useEffect(() => {
		if (!channelProps.selectedJoin) return;

		const controller = new AbortController();

		const getChannelInfo = async () => {
			try {
				const { data: { channel } } = await axios.get<{ channel: ChannelPublic }>(
					`${BACKEND_URL}/channel/${channelProps.selectedJoin?.id}`,
					{
						withCredentials: true,
						signal: controller.signal,
					}
				);
				if (channel) {
					setChannel(channel);
				} else {
					throw new Error('No channel received');
				}
			} catch (error) {
				if (!axios.isCancel(error)) {
					setErrorMsg(formatErrorMessage(error, 'Failed to get channel info:'));
				}
			}	
		}

		getChannelInfo();
		return () => {
			controller.abort();
			setLoading(true);
			setErrorMsg(undefined);
		}
	}, [channelProps.selectedJoin.id]);
	
	useEffect(() => {
		if (!channelProps.selectedJoin) return;

		function handleUpdate(data: DataUpdateType<ChannelPublic>) {
			if (data.updateType !== UpdateType.updated) return;

			setChannel((prevProp) => {
				if (prevProp?.id !== data.id) return (prevProp);

				return ({ ...prevProp, ...data.content as ChannelPublic })
			});
		}

		userSocket?.on('selectedPublicChannelUpdate', handleUpdate);
		return () => {
			userSocket?.off('selectedPublicChannelUpdate', handleUpdate);
		};
	}, [channelProps.selectedJoin.id]);

	useEffect(() => {
		if (!channel && !errorMsg) return;
		setLoading(false);
	}, [channel, errorMsg]);

  const onCancel = () => {
    changeProps({ selectedJoin: undefined });
  };

	const openChatBox = () => {
		const membership = channelProps.memberships.find((membership) =>
			membership.channel.id === channel?.id
		);
		changeProps({ selected: membership, state: ChannelStates.chat });
		onCancel();
	}

  const handleJoin = async () => {
		if (joining) return;
    setJoining(true);

    const payload = {
      password:
        channel?.type === ChannelType.protected ? passwordInputRef.current?.value : null,
    };

    try {
			const membership: MemberClient = await retryOperation(async () =>{
				const response = await axios.post(
					`${BACKEND_URL}/channel/join/${channel?.id}`,
					payload,
					{
						withCredentials: true,
					}
				);
				return (response.data.membership);
			})
			if (membership) {
				setChannelProps((prev) => ({
					...prev,
					selected: membership,
					state: ChannelStates.chat,
				}));
			}
			onCancel();
    } catch (error: any) {
			handleError('Could not join channel: ', error);
    } finally {
			setJoining(false);
		}
  };

  return (
    <>
      <CardOverlay onClick={onCancel} />
      <CenteredCard sx={{ overflow: 'auto' }}>
				<CardLoadingBox>
					<CircularProgress size={80} sx={{ display: loading ? 'flex' : 'none' }}/>
				</CardLoadingBox>
				<CustomCardContent sx={{ display: loading ? 'none' : 'flex' }}>
					<Stack spacing={1.6} alignItems={'center'} >
						<CustomAvatar
							variant='channel'
							sx={{ height: 170, width: 170 }}
							src={channel?.image}
						/>

						<Typography fontSize={'large'}>{channel?.name || '???'}</Typography>

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
								{channel?.description ||'None provided :c'}
							</Typography>
						</DescriptionBox>

						{channel?.type === ChannelType.protected && !channel.isJoined && !channel.isBanned && (
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

					{(channel?.isJoined || channel?.isBanned || errorMsg) && (
						<Typography
							variant="body2"
							color={'textSecondary'}
							sx={{
								fontSize: 'medium',
							}}
						>
							{errorMsg
								|| (channel?.isJoined && 'You are already in this channel')
								|| (channel?.isBanned && 'You are banned from this channel')}
						</Typography>
					)}

					<ButtonBar>
						<Button onClick={onCancel} sx={{ minWidth: 100, height: 40 }}>
							Cancel
						</Button>

						<Button
							variant="contained"
							onClick={channel?.isJoined ? openChatBox : handleJoin}
							disabled={channel?.isBanned || Boolean(errorMsg)}
							sx={{
								minWidth: 100,
								height: 40,
							}}
						>
							{joining
								? <CircularProgress color='secondary' size={30} />
								: channel?.isJoined ? 'Joined' : 'join'}
						</Button>
					</ButtonBar>
				</CustomCardContent>
      </CenteredCard>
    </>
  );
};
