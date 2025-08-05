import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePayments } from '../../hooks/usePayments';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const IncomeChart: React.FC = () => {
  const { payments } = usePayments();

  const monthlyData = React.useMemo(() => {
    const data: { [key: string]: number } = {};
    
    payments?.forEach((payment) => {
      if (payment.payment_date) {
        const month = format(new Date(payment.payment_date), 'MMM yyyy', { locale: es });
        data[month] = (data[month] || 0) + payment.amount;
      }
    });

    return Object.entries(data)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
  }, [payments]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Ingresos Mensuales
        </Typography>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value) =>
                  new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                    notation: 'compact',
                  }).format(value)
                }
              />
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                  }).format(value)
                }
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#2196f3"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default IncomeChart; 