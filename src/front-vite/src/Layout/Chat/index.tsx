import React, { useState } from 'react';
import { ChatStatus } from './InterfaceChat';
import ContentBubble from './ContentBubble';
import ContentDrawer from './ContentDrawer';
import ContentChat from './ContentChat';
import { useChat } from '../../Providers/ChatContext/Chat';

interface Chat {
  id: number;
  name: string;
  avatar: string;
}

export const Chat: React.FC = () => {
	const { chatProps } = useChat();

  // parameters - will be added later
  function VerifyUser(): boolean {
    return (true);
  }

  function GetChatRooms(): Chat[] {

  }

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
  // return (
  //   {chatStatus === ChatStatus.Bubble && (<ChatBubble chatProps={chatProps} setChatProps={setChatProps} />)}
  //   {chatStatus === ChatStatus.Drawer && (<ChatDrawer chatProps={chatProps} setChatProps={setChatProps} />)}
  //   {chatStatus === ChatStatus.Chatbox && (<ChatBox chatProps={chatProps} setChatProps={setChatProps} />)}
  // );
  return (
    <div >
      {renderChatContent()}
    </div>
  );
};

export default Chat;
