import React from 'react';
import { ChatProps, ChatStatus, ChatRoom } from './InterfaceChat';
import { Box, Fab } from '@mui/material';
import { Chat as ChatIcon } from '@mui/icons-material';
import { useChat } from '../../Providers/ChatContext/Chat';

export const ContentBubble = () => {
	const { changeChatProps } = useChat();

  const toggleChatStatus = (status: ChatStatus, selection: ChatRoom | null) => {
    changeChatProps({ chatStatus: status, selected: selection});
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16 }}>
      <Fab
        color="secondary"
        aria-label="chat"
        onClick={() => { toggleChatStatus(ChatStatus.Drawer, null) }}>
        <ChatIcon />
      </Fab>
    </Box>
  );
};

export default ContentBubble;
