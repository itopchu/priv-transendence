import React from 'react';
import Typography from '@mui/material';
import { User } from '../../Providers/UserContext/User';

export enum ChatStatus {
    Bubble = 'bubble',
    Drawer = 'drawer',
    Chatbox = 'chatbox',
    Settings = 'settings',
}


export type Message = {
  id: number;
  content: string;
  author: User;
  timestamp: Date;
  sent?: boolean;
};

export interface ChatMessage {
  message: React.ReactElement<typeof Typography>;
  user: string;
  userPP: React.ReactElement;
  timestamp: React.ReactElement;
}

export enum UserRoles {
  Administrator = 'Administrator',
  Guest = 'Guest',
  Owner = 'Owner',
}

export interface UserProps {
  name: string;
  role: string;
  email: string;
  password: string;
  icon: React.ReactElement;
}

export interface ChatSettings {
  icon: React.ReactElement;
  type: 'public' | 'private' | 'password';
  password: string | null;
  users: UserProps[];
  owner: string;
}

export interface Chat {
  id: number;
  user: User;
  unreadMsgCount: number;
}

export interface ChatProps {
  chats: Chat[];
  chatStatus: ChatStatus;
  selected: Chat | undefined;
  messages: Message[];
  searchPrompt: string | undefined;
}
