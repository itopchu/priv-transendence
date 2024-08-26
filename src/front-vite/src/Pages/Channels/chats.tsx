import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Divider,
  Avatar,
  Typography,
  Stack,
  styled,
  IconButton,
} from '@mui/material';
import { SendRounded as SendIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useUser } from '../../Providers/UserContext/User';

const ChatContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: '80vh',
  backgroundColor: theme.palette.primary.light,
  display: 'flex',
  flexDirection: 'column-reverse',
  padding: theme.spacing(2),
}));

const ChatBubble = styled(Box)(({ theme }) => ({
  display: 'inline-block',
  backgroundColor: theme.palette.secondary.dark,
  borderRadius: '1.5em',
  alignSelf: 'flex-start',
  padding: '6px 1em',
  wordBreak: 'break-word',
}));

const ChatMessages = styled(Stack)(({ theme }) => ({
  flex: -1,
  overflow: 'auto',
  padding: theme.spacing(2),
}));

const TextBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: '2em',
  backgroundColor: theme.palette.primary.dark,
  bottom: theme.spacing(2),
  boxShadow: theme.shadows[5],
}));

const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const { user } = useUser();
  const theme = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const generateMessages = () => {
    if (!messages.length) return;

    return (
      <ChatMessages>
        {messages.map((msg, index) => (
          <>
            <Divider
              sx={{
                alignSelf: 'flex-start',
                backgroundColor: theme.palette.primary.light,
              }}
            />
            <Stack
              key={index}
              direction="row"
              spacing={1}
              paddingLeft={!index ? 0 : 7.3}
              alignItems="flex-start"
            >
              {!index && (
                <Avatar sx={{ width: 50, height: 50 }} src={user?.image} />
              )}
              <Stack>
                {index === 0 && (
                  <Typography
                    key={index}
                    variant="h3"
                    sx={{ fontWeight: 'bold', fontSize: 'medium' }}
                  >
                    {user?.nameNick ? user.nameNick : user?.nameFirst}
                    {index === 0 && (
                      <Typography
                        key={index}
                        variant="caption"
                        sx={{ fontSize: '0.7em' }}
                      >
                        {' timestamp'}
                      </Typography>
                    )}
                  </Typography>
                )}

                <ChatBubble
                  sx={{
                    borderTopLeftRadius: !index ? '' : '0.2em',
                    borderBottomLeftRadius:
                      index + 1 === messages.length ? '' : '0.2em',
                  }}
                >
                  <Typography
                    key={index}
                    variant="body1"
                    sx={{ whiteSpace: 'pre-line' }}
                  >
                    {msg}
                  </Typography>
                </ChatBubble>
              </Stack>
            </Stack>
          </>
        ))}
      </ChatMessages>
    );
  };

  const onSend = () => {
    const cleanMessage = message
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');

    if (cleanMessage) {
      setMessages((prevMessages) => [...prevMessages, cleanMessage]);
      setMessage('');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages]);

  return (
    <ChatContainer>
      <TextBar>
        <TextField
          variant="standard"
          fullWidth
          multiline
          maxRows={4}
          InputProps={{
            disableUnderline: true,
            sx: {
              color: 'white',
              padding: '7px',
            },
          }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Type a message..."
        />
        <IconButton onClick={onSend}>
          <SendIcon />
        </IconButton>
      </TextBar>
      {generateMessages()}
      <div ref={messagesEndRef} />
    </ChatContainer>
  );
};

export default ChatBox;
