import React, { useState } from 'react';
import { TextField, Button, Stack, useTheme } from '@mui/material';
import { useUser } from '../../Providers/UserContext/User';
import axios from 'axios'; // Import axios

export const SocialSettings: React.FC = () => {
  const theme = useTheme();
  const { user, setUser } = useUser();
  // State hooks for form fields
  const [nickname, setNickname] = useState(user?.nameNick || '');
  const [email, setEmail] = useState(user.email);
  const [greeting, setGreeting] = useState(user.greeting);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const payload = { nickname, email, greeting };
    const BACKEND_URL: string = import.meta.env.ORIGIN_URL_BACK || 'http://localhost.codam.nl:4000';
    try {
      const response = await axios.post(BACKEND_URL + '/user/update', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      if (response.data.userDTO)
        setUser(response.data.userDTO);
    } catch (error) {
      setNickname(user?.nameNick || '');
      setEmail(user.email);
      setGreeting(user.greeting);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack flexGrow={1} gap={'2em'} direction={'column'} alignItems={'center'} width="100%">
        <TextField
          fullWidth
          label="Nickname"
          variant='standard'
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          color='secondary'
          InputLabelProps={{
            style: { color: theme.palette.secondary.main },
          }}
          inputProps={{
            maxLength: 50,
          }}
          multiline
        />
        <TextField
          fullWidth
          label="Email"
          variant='standard'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          color='secondary'
          InputLabelProps={{
            style: { color: theme.palette.secondary.main },
          }}
          inputProps={{
            maxLength: 100,
          }}
          multiline
        />
        <TextField
          fullWidth
          label="Greeting"
          variant='standard'
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          color='secondary'
          InputLabelProps={{
            style: { color: theme.palette.secondary.main },
          }}
          inputProps={{
            maxLength: 100,
          }}
          multiline
        />
      </Stack>
      <Button
        fullWidth
        variant='contained'
        color='secondary'
        onClick={handleSubmit}
        sx={{
          borderRadius: '1em',
          fontWeight: 'bold',
        }}
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </>
  );
}

export default SocialSettings;