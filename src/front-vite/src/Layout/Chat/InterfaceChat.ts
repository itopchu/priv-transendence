import { User, UserPublic } from '../../Providers/UserContext/User';

export enum ChatStatus {
    Bubble = 'bubble',
    Drawer = 'drawer',
    Chatbox = 'chatbox',
}

export type Message = {
  id: number;
  content: string;
  author: User;
  timestamp: Date;
  sent?: boolean;
};

export interface Chat {
  id: number;
  user: UserPublic;
  unreadMsgCount: number;
}

export interface ChatProps {
  chats: Chat[];
  chatStatus: ChatStatus;
  selected: Chat | undefined;
  messages: Message[];
  searchPrompt: string | undefined;
}
