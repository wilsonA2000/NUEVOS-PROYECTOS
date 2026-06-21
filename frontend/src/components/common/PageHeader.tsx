/**
 * PageHeader — encabezado de página unificado.
 *
 * Reemplaza el patrón ad-hoc (Box + Typography h4 + botón suelto) repetido en
 * decenas de páginas. Da consistencia tipográfica (título con la fuente
 * display), un overline de sección opcional, subtítulo y zona de acciones,
 * responsive (las acciones bajan en móvil).
 *
 * Uso:
 *   <PageHeader
 *     overline="Gestión"
 *     title="Mis Propiedades"
 *     subtitle="Administra tus inmuebles publicados"
 *     icon={<HomeWorkIcon />}
 *     actions={<Button variant="contained">Nueva propiedad</Button>}
 *   />
 */
import React from 'react';
import { Box, Stack, Typography, Avatar } from '@mui/material';

export interface PageHeaderProps {
  title: string;
  overline?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  overline,
  subtitle,
  icon,
  actions,
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      alignItems: { xs: 'flex-start', sm: 'center' },
      justifyContent: 'space-between',
      gap: 2,
      mb: { xs: 3, md: 4 },
    }}
  >
    <Stack direction='row' spacing={2} alignItems='center'>
      {icon && (
        <Avatar
          variant='rounded'
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            width: 48,
            height: 48,
            boxShadow: '0 6px 16px -6px rgba(67, 56, 202, 0.6)',
            '& svg': { fontSize: 26 },
          }}
        >
          {icon}
        </Avatar>
      )}
      <Box>
        {overline && (
          <Typography
            variant='overline'
            sx={{ color: 'primary.main', display: 'block', lineHeight: 1.4 }}
          >
            {overline}
          </Typography>
        )}
        <Typography variant='h4' component='h1'>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>

    {actions && (
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
          width: { xs: '100%', sm: 'auto' },
        }}
      >
        {actions}
      </Box>
    )}
  </Box>
);

export default PageHeader;
