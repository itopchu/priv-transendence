import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useUser } from "../../Providers/UserContext/User";
import axios from "axios";

const LogoutPage: React.FC = () => {
  const { setUser } = useUser();
  const navigate = useNavigate();
  const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';

  useEffect(() => {
    const logout = async () => {
      try {
        await axios.get(BACKEND_URL + '/auth/logout', { withCredentials: true });
        setUser({ id: 0 });
      } catch (error) {
        console.error('Error logging out:', error);
      } finally {
        navigate('/');
      }
    }
    logout();
  }, [navigate, setUser]);

  return (<></>);
};

export default LogoutPage;