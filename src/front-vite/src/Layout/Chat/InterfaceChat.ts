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
	edited: boolean;
};

export interface IChat {
  id: number;
  user: UserPublic;
  modified: Date;
}

export interface ChatProps {
  chats: IChat[];
  chatStatus: ChatStatus;
  selected: IChat | undefined;
	loading: boolean;
}
