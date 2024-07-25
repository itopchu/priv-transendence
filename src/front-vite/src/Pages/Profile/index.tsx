import React, { useEffect, useState } from 'react';
import { Stack, useTheme } from '@mui/material';
import { useMediaQuery } from '@mui/material';
import { User, useUser } from '../../Providers/UserContext/User';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import OwnerInfo from './ownerInfo';
import StatsContainer from './statsContainer';
import FriendsBox from './friends';

const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const visitedUserId = useLocation().pathname.split('/').pop();
  const [owner, setOwner] = useState<User>();
  const { user } = useUser();

  const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';
  useEffect(() => {
    const getOwner = async () => {
      try {
        const response = await axios.get(BACKEND_URL + "/user/" + visitedUserId, { withCredentials: true })
        setOwner(response.data);
      } catch (error) {
        console.error('Error fetching profile owner:', error);
        navigate('/');
      }
    };
    getOwner();
  }, [visitedUserId]);


  let pageWrapper = () => {
    return (
      <>
        <OwnerInfo owner={owner} setOwner={setOwner} />
        <Stack
          direction={isSmallScreen ? 'column' : 'row'}
          bgcolor={theme.palette.primary.dark}
          minHeight={'60vh'}
        >
          {user.id === owner?.id && <FriendsBox owner={owner} setOwner={setOwner} />}
          <StatsContainer owner={owner} setOwner={setOwner} />
        </Stack>
      </>
    );
  };

  return (
    pageWrapper()
  );
};

export default ProfilePage;