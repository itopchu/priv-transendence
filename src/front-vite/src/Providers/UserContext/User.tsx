import axios from 'axios';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../../socket'
import { Socket } from 'socket.io-client';

export interface User {
  id: number;
  nameNick?: string;
  nameFirst?: string;
  nameLast?: string;
  email?: string;
  image?: string;
  greeting?: string;
}

export interface UserClient extends User {
  auth2F?: boolean;
}

export interface UserPublic extends User {
  status?: 'online' | 'offline' | 'ingame';
}

interface UserContextType {
  user: UserClient;
  setUser: React.Dispatch<React.SetStateAction<UserClient>>;
  userSocket: Socket | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';
const SOCKET_URL: string = import.meta.env.ORIGIN_URL_WEBSOCKET || 'http://localhost.codam.nl:3001';
const userConnection = socket;

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserClient>({ id: 0 });
  const [userSocket, setUserSocket] = useState<Socket | null>(null);
  const navigate = useNavigate();

  const userSocketDisconnect = () => {
    if (userSocket) {
      userSocket.disconnect();
      setUserSocket(null);
    }
  }

  useEffect(() => {
    const validate = async () => {
      try {
        const response = await axios.get(BACKEND_URL + '/auth/validate', { withCredentials: true });
        if (response.data.userClient) {
          setUser(response.data.userClient);
        }
        if (response.data.userClient?.id === 0 && response.data.userClient?.auth2F) {
          navigate('/2fa');
        }
      } catch (error) {
        navigate('/');
        setUser({ id: 0 });
      }
    };

    validate();

    if (user.id === 0) {
      userSocketDisconnect();
      return;
    }

    userConnection.on('connect', () => {
      console.log('Connected to user namespace')
    })
    userConnection.on('connect_error', (error) => {
      console.error('Connection error:', error.message);

    })
    userConnection.on('connect_failed', () => {
      console.error('Connection failed');
    });

    userConnection.on('disconnect', () => {
      console.log('Disconnected from user namespace');
    });
    setUserSocket(userConnection);

    return userSocketDisconnect;
  }, [user.id]);

  return (
    <UserContext.Provider value={{ user, setUser, userSocket }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};