import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Menu, MenuItem, Typography } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const currentLanguage = i18n.language?.startsWith('es') ? 'es' : 'en';

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleSelect = (lang: 'es' | 'en') => {
    i18n.changeLanguage(lang);
    handleClose();
  };

  return (
    <>
      <Button
        size='small'
        onClick={handleOpen}
        sx={{
          minWidth: 80,
          color: 'inherit',
          textTransform: 'none',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          py: 0.5,
          px: 1,
          '&:hover': { borderColor: 'rgba(255, 255, 255, 0.5)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <LanguageIcon fontSize='small' />
          <Typography variant='body2' component='span'>
            {currentLanguage === 'es' ? 'ES' : 'EN'}
          </Typography>
        </Box>
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          selected={currentLanguage === 'es'}
          onClick={() => handleSelect('es')}
        >
          ES — Español
        </MenuItem>
        <MenuItem
          selected={currentLanguage === 'en'}
          onClick={() => handleSelect('en')}
        >
          EN — English
        </MenuItem>
      </Menu>
    </>
  );
};

export default LanguageSelector;
