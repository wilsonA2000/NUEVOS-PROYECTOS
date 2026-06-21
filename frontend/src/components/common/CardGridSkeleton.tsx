/**
 * CardGridSkeleton — placeholder de carga para listas en grilla de tarjetas.
 *
 * Reemplaza el spinner centrado por skeletons con la forma aproximada de las
 * tarjetas: mejor velocidad percibida y sin salto de layout al cargar.
 *
 * Uso:
 *   {isLoading ? <CardGridSkeleton count={6} /> : <Grid>…</Grid>}
 */
import React from 'react';
import { Grid, Card, CardContent, Skeleton, Box } from '@mui/material';

export interface CardGridSkeletonProps {
  count?: number;
  /** breakpoints de columna por tarjeta (igual que <Grid item>) */
  columns?: { xs?: number; sm?: number; md?: number; lg?: number };
}

const CardGridSkeleton: React.FC<CardGridSkeletonProps> = ({
  count = 6,
  columns = { xs: 12, sm: 6, md: 4 },
}) => (
  <Grid container spacing={3}>
    {Array.from({ length: count }).map((_, i) => (
      <Grid item {...columns} key={i}>
        <Card sx={{ height: '100%' }}>
          <Skeleton variant='rectangular' height={140} />
          <CardContent>
            <Skeleton variant='text' width='70%' height={28} />
            <Skeleton variant='text' width='45%' />
            <Box sx={{ mt: 1.5, mb: 1 }}>
              <Skeleton variant='rounded' width={90} height={24} />
            </Box>
            <Skeleton variant='text' width='90%' />
            <Skeleton variant='text' width='60%' />
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

export default CardGridSkeleton;
