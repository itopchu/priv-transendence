import React from 'react';
import { Stack, Avatar, Typography, Box, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { GitHub } from '@mui/icons-material';

interface Developer {
  photo: string;
  name: string;
  git: string;
}

const team: Developer[] = [
  {
    photo: 'https://cdn.intra.42.fr/users/d79fb7299db9e1dca736792ac5f0276a/itopchu.jpg',
    name: 'Ibrahim Topchu',
    git: 'https://www.github.com/itopchu'
  },
  {
    photo: 'https://cdn.intra.42.fr/users/1d4a303b629c19ca02e1c874a31a808a/seyildir.jpg',
    name: 'Selim Yildirim',
    git: 'https://github.com/X3l1m'
  }
]

export const Bar: React.FC = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  const devCard = (dev: Developer, index: number) => {
    return (
      <Stack
        direction={'column'}
        borderRadius={'1.5em'}
        padding={'0.8em'}
        bgcolor={theme.palette.primary.main}
        key={index}
        flex={1}
        alignItems={'center'}
        maxWidth={'200px'}
        overflow={'hidden'}
        width={`100/${team.length}%`}
        sx={{
          transition: 'all 0.3s',
          '&:hover': {
            boxShadow: `1px 2px 3px 1px ${theme.palette.secondary.light}`,
            scale: '1.03',
          },
        }}
      >
        <Avatar
          sx={{
            width: '100%',
            height: 'auto',
            aspectRatio: '1/1',
            boxShadow: '1px 1px 5px rgba(0,0,0,3)',
          }}
          src={dev.photo}
          alt={dev.name}
        />
        {!isSmallScreen && (
          <Stack direction={'column'} flexGrow={1} justifyContent={'space-between'}>
            <Box>
              <Typography fontSize={isSmallScreen ? '0.8em' : '1.2em'} textAlign={'center'} variant="subtitle1" sx={{ mt: 2 }}>
                {dev.name}
              </Typography>
            </Box>
            <IconButton color={'secondary'} sx={{ alignSelf: 'center' }} href={dev.git} target="_blank" rel="noopener noreferrer" >
              <GitHub />
            </IconButton>
          </Stack>
        )}
      </Stack>
    );
  }

  return (
    <Stack
      component="footer"
      bgcolor={theme.palette.background.default}
      height={isSmallScreen ? 'auto' : '27em'}
      alignContent={'center'}
      direction={'row'}
      justifyContent={'space-evenly'}
      padding={'2em'}
      spacing={'1em'}
    >
      {team.map((developer, index) => (
        devCard(developer, index)
      ))}
    </Stack>
  );
};

export default Bar;
