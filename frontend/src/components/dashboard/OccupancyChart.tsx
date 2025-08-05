import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useProperties } from '../../hooks/useProperties';

const COLORS = ['#4caf50', '#f44336', '#ff9800', '#2196f3'];

const OccupancyChart: React.FC = () => {
  const { properties } = useProperties();

  const occupancyData = React.useMemo(() => {
    const data: { [key: string]: number } = {};
    
    properties?.forEach((property) => {
      data[property.status] = (data[property.status] || 0) + 1;
    });

    return Object.entries(data).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
    }));
  }, [properties]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Estado de Ocupación
        </Typography>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={occupancyData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {occupancyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default OccupancyChart; 