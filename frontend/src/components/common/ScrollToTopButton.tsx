import React, { useEffect, useState } from 'react';
import { Fab, Fade } from '@mui/material';
import { KeyboardArrowUp as ArrowUpIcon } from '@mui/icons-material';

const ScrollToTopButton: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Fade in={visible}>
      <Fab
        size="small"
        aria-label="Volver arriba"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          bgcolor: 'primary.main',
          color: 'white',
          zIndex: 1200,
          boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        <ArrowUpIcon />
      </Fab>
    </Fade>
  );
};

export default ScrollToTopButton;
