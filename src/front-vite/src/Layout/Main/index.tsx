import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '../../Pages/Home/index';
import Game from '../../Pages/Game/index';
import ErrorPage from '../../Pages/Error/index';
import UserSettings from '../../Pages/UserSettings/index';
import ProfilePage from '../../Pages/Profile';
import LoginPage from '../../Pages/Login/index';
import ChannelsPage from '../../Pages/Channels/index';
import LogoutPage from '../../Pages/Logout';
import { useUser } from '../../Providers/UserContext/User';
import AuthPage from '../../Pages/2FA';
import { ChannelLineContextProvider } from '../../Providers/ChannelContext/ChannelLine';
import InvitePage from '../../Pages/Invite';

export const Main: React.FC = () => {
  const { user } = useUser();

  return (
    <Routes>
      {user && user.id ? (
        <>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/game" element={<Game />} />
          <Route path="/channels" element={<ChannelLineContextProvider> <ChannelsPage /> </ChannelLineContextProvider>} />
          <Route path="/channels/invite/:inviteId" element={<InvitePage />} />
          <Route path="/channels/invite/" element={<Navigate replace to={'/channels'} />} />
          <Route path="/profile/settings" element={<UserSettings />} />
          <Route path="/profile/:userid" element={<ProfilePage />} />
          <Route path="/profile/" element={<Navigate replace to={`/profile/${user.id}`} />} />
          <Route path="/profile" element={<Navigate replace to={`/profile/${user.id}`} />} />
        </>
      ) : (
        <>
          <Route path="/" element={<LoginPage />} />
          <Route path="/2fa" element={<AuthPage />} />
        </>
      )}
      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
};

export default Main;
