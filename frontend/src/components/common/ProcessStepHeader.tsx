/**
 * ProcessStepHeader — encabezado inmersivo unificado para vistas/stages.
 *
 * Reemplaza los headers ad-hoc (gradientes+iconos distintos por pantalla) con
 * un patrón consistente nivel Stripe/Vercel.
 *
 * Uso:
 *   <ProcessStepHeader
 *     icon={<HomeIcon />}
 *     title="Candidatos Aprobados"
 *     subtitle="Gestiona tus candidatos a través del proceso de contratación"
 *     kind="primary"
 *   />
 */
import React from 'react';
import { Box, Stack, Typography, Avatar, SxProps, Theme } from '@mui/material';
import { vh } from '../../theme/tokens';

type Kind = 'primary' | 'secondary' | 'success' | 'warning' | 'hero';

export interface ProcessStepHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  kind?: Kind;
  sx?: SxProps<Theme>;
}

const ProcessStepHeader: React.FC<ProcessStepHeaderProps> = ({
  icon,
  title,
  subtitle,
  trailing,
  kind = 'primary',
  sx,
}) => {
  const gradient = vh.gradients[kind];
  return (
    <Box
      sx={{
        background: gradient,
        color: 'common.white',
        borderRadius: `${vh.radius.lg}px`,
        p: { xs: 2.5, md: 3.5 },
        boxShadow: vh.shadows.card,
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
        ...sx,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2.5}
      >
        <Avatar
          sx={{
            width: 56,
            height: 56,
            bgcolor: 'rgba(255,255,255,0.18)',
            color: 'common.white',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: vh.shadows.subtle,
          }}
        >
          {icon}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant='body2'
              sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.5 }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {trailing && <Box sx={{ flexShrink: 0 }}>{trailing}</Box>}
      </Stack>
    </Box>
  );
};

export default ProcessStepHeader;
