import React, { useEffect, useState } from 'react';
import { Avatar, Box, Button, Stack, Typography, useTheme, Divider, Grid, IconButton, Container } from '@mui/material';
import { useMediaQuery } from '@mui/material';
import { darken, alpha } from '@mui/material/styles';
import {
  AccountCircle as AccountCircleIcon,
  EmojiEvents as Cup,
  PersonAdd as AddIcon,
  Block as BlockIcon,
  VideogameAsset as GameIcon,
  Message as MessageIcon,
  PersonOff as PersonOffIcon,
} from '@mui/icons-material';
import { User, UserStatus } from '../../Providers/UserContext/User';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import OwnerInfo from './ownerInfo';
import StatsContainer from './statsContainer';
import FriendsBox from './friends';

const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const visitedUserId = useLocation().pathname.split('/').pop();
  const [owner, setOwner] = useState<User>();

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
          <FriendsBox owner={owner} setOwner={setOwner} />
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