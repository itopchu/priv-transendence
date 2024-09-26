import { ChatStatus } from './InterfaceChat';
import { Box, Fab  } from '@mui/material';
import { Chat as ChatIcon } from '@mui/icons-material';
import { useChat } from '../../Providers/ChatContext/Chat';

export const ContentBubble = () => {
	const { changeChatProps } = useChat();

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16 }}>
      <Fab
				color={'secondary'}
        aria-label="chat"
        onClick={() => changeChatProps({ chatStatus: ChatStatus.Drawer, selected: undefined})}
			>
        <ChatIcon />
      </Fab>
    </Box>
  );
};

export default ContentBubble;
