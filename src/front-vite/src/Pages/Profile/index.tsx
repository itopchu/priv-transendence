import React, { Component, useEffect, useState } from 'react';
import { Stack, useTheme } from '@mui/material';
import { useMediaQuery } from '@mui/material';
import { UserPublic, useUser } from '../../Providers/UserContext/User';
import { useLocation, useNavigate } from 'react-router-dom';
import VisitedInfo from './ownerInfo';
import StatsContainer from './statsContainer';
import FriendsBox from './friends';
import { useChat } from '../../Providers/ChatContext/Chat';

export let visitedUserId: number = 0;

const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  visitedUserId = Number(location.pathname.split('/').pop());
  const [visitedUser, setVisitedUser] = useState<UserPublic>({ id: visitedUserId });
  const { user, userSocket } = useUser();
  const { chatProps } = useChat();

  function handleSubscriptionError(errorMessage: string) {
    console.error(`Subscription error: ${errorMessage}`);
    navigate('/404');
  }

  useEffect(() => {
    if (!userSocket) return;

    function handleProfileStatus(receivedUser: UserPublic) {
			if (receivedUser?.id === visitedUserId) {
				setVisitedUser(receivedUser);
			}
    };

    userSocket.emit('profileStatus', visitedUserId);
    userSocket.on('profileStatus', handleProfileStatus);
    userSocket.on('profileError', handleSubscriptionError);

    return () => {
      if (userSocket) {
		console.log('OFF')
		if (chatProps.selected?.user.id !== Number(visitedUserId))
			userSocket.emit('unsubscribeProfileStatus', visitedUserId);
        userSocket.off('profileStatus', handleProfileStatus);
        userSocket.off('subscriptionError', handleSubscriptionError);
      }
      setVisitedUser({ id: 0 });
    };
  }, [userSocket, location]);

  return (
    <>
      <VisitedInfo visitedUser={visitedUser} />
      <Stack
        direction={isSmallScreen ? 'column' : 'row'}
        bgcolor={theme.palette.primary.dark}
        minHeight={isSmallScreen ? '1vh' : '60vh'}
      >
        {user.id === visitedUser?.id && <FriendsBox visitedUser={visitedUser} />}
        <StatsContainer visitedUser={visitedUser} />
      </Stack>
    </>
  );
};

export default ProfilePage;
