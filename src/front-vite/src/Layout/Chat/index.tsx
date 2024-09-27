import React, { useState } from 'react';
import { ChatStatus } from './InterfaceChat';
import ContentBubble from './ContentBubble';
import ContentDrawer from './ContentDrawer';
import ContentChat from './ContentChat';
import { useChat } from '../../Providers/ChatContext/Chat';

const Chat: React.FC = () => {
	const { chatProps } = useChat();

  const renderChatContent = () => {
    switch (chatProps.chatStatus) {
      case ChatStatus.Drawer:
        return <ContentDrawer />;
      case ChatStatus.Chatbox:
        return <ContentChat />;
      default:
        return <ContentBubble />;
    }
  };

  return (
    <div >
      {renderChatContent()}
    </div>
  );
};

export default Chat;
