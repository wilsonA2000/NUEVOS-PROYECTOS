import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  MenuItem,
  FormControl,
  SelectChangeEvent,
  Box,
  Typography,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const handleChange = (event: SelectChangeEvent<string>) => {
    const lang = event.target.value;
    i18n.changeLanguage(lang);
  };

  const currentLanguage = i18n.language?.startsWith('es') ? 'es' : 'en';

  return (
    <FormControl size='small' sx={{ minWidth: 80 }}>
      <Select
        value={currentLanguage}
        onChange={handleChange}
        displayEmpty
        variant='outlined'
        sx={{
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            py: 0.5,
            px: 1,
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.3)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.5)',
          },
          color: 'inherit',
          fontSize: '0.875rem',
        }}
        renderValue={value => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LanguageIcon fontSize='small' />
            <Typography variant='body2' component='span'>
              {value === 'es' ? 'ES' : 'EN'}
            </Typography>
          </Box>
        )}
      >
        <MenuItem value='es'>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='body2'>ES</Typography>
            <Typography variant='body2' color='text.secondary'>
              Espa&ntilde;ol
            </Typography>
          </Box>
        </MenuItem>
        <MenuItem value='en'>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='body2'>EN</Typography>
            <Typography variant='body2' color='text.secondary'>
              English
            </Typography>
          </Box>
        </MenuItem>
      </Select>
    </FormControl>
  );
};

export default LanguageSelector;
