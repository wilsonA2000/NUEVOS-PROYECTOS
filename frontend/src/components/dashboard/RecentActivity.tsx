import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Home as HomeIcon,
  Description as ContractIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { usePayments } from '../../hooks/usePayments';
import { useProperties } from '../../hooks/useProperties';
import { useContracts } from '../../hooks/useContracts';
import { useMessages } from '../../hooks/useMessages';
import { formatCurrency } from '../../utils/formatters';
import { ensureArray } from '../../utils/arrayUtils';

const RecentActivity: React.FC = () => {
  const { transactions } = usePayments();
  const { properties } = useProperties();
  const { contracts } = useContracts();
  const { messages } = useMessages();

  const recentActivity = React.useMemo(() => {
    // Asegurar que todos los datos sean arrays
    const transactionsArray = ensureArray(transactions);
    const propertiesArray = ensureArray(properties);
    const contractsArray = ensureArray(contracts);
    const messagesArray = ensureArray(messages);

    const activities = [
      ...transactionsArray.map((transaction: any) => ({
        type: 'payment',
        title: `Pago recibido de ${transaction.tenantName || 'Usuario'}`,
        description: formatCurrency(transaction.amount || 0),
        date: new Date(transaction.date || Date.now()),
        icon: <PaymentIcon color="success" />,
      })),
      ...propertiesArray.map((property: any) => ({
        type: 'property',
        title: `Propiedad ${property.status === 'available' ? 'disponible' : 'ocupada'}`,
        description: property.address || 'Sin dirección',
        date: new Date(property.updatedAt || Date.now()),
        icon: <HomeIcon color="primary" />,
      })),
      ...contractsArray.map((contract: any) => ({
        type: 'contract',
        title: `Nuevo contrato para ${contract.tenantName || 'Usuario'}`,
        description: `Inicio: ${new Date(contract.startDate || Date.now()).toLocaleDateString()}`,
        date: new Date(contract.createdAt || Date.now()),
        icon: <ContractIcon color="info" />,
      })),
      ...messagesArray.map((message: any) => ({
        type: 'message',
        title: `Nuevo mensaje de ${message.sender || 'Usuario'}`,
        description: (message.content || '').substring(0, 50) + '...',
        date: new Date(message.createdAt || Date.now()),
        icon: <MessageIcon color="warning" />,
      })),
    ];

    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  }, [transactions, properties, contracts, messages]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Actividad Reciente
        </Typography>
        <List>
          {recentActivity.length === 0 ? (
            <ListItem>
              <ListItemText primary="No hay actividad reciente" />
            </ListItem>
          ) : (
            recentActivity.map((activity, index) => (
              <React.Fragment key={`${activity.type}-${index}`}>
                <ListItem>
                  <ListItemIcon>{activity.icon}</ListItemIcon>
                  <ListItemText
                    primary={activity.title}
                    secondary={
                      <>
                        {activity.description}
                        <br />
                        {activity.date.toLocaleDateString()}
                      </>
                    }
                  />
                </ListItem>
                {index < recentActivity.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </List>
      </CardContent>
    </Card>
  );
};

export default RecentActivity; 