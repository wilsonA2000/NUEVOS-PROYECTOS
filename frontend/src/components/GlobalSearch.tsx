import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Popper,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  CircularProgress,
  useTheme,
  useMediaQuery,
  ClickAwayListener,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Home as HomeIcon,
  Description as ContractIcon,
  Payment as PaymentIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProperties } from '../hooks/useProperties';
import { useContracts } from '../hooks/useContracts';
import { usePayments } from '../hooks/usePayments';
import { useMessages } from '../hooks/useMessages';

interface SearchResult {
  id: string;
  type: 'property' | 'contract' | 'payment' | 'message';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const GlobalSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const { properties } = useProperties();
  const { contracts } = useContracts();
  const { transactions: payments } = usePayments();
  const { messages: messagesData } = useMessages();

  useEffect(() => {
    if (searchTerm.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    const searchResults: SearchResult[] = [];

    // Search in properties
    (properties as any)?.forEach((property: any) => {
      if (
        property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.description?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        searchResults.push({
          id: property.id,
          type: 'property',
          title: property.address,
          subtitle: 'Propiedad',
          icon: <HomeIcon />,
        });
      }
    });

    // Search in contracts
    (contracts as any)?.forEach((contract: any) => {
      if (
        contract.property?.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        searchResults.push({
          id: contract.id,
          type: 'contract',
          title: `${contract.property?.address || 'N/A'} - ${contract.tenant_name || 'N/A'}`,
          subtitle: 'Contrato',
          icon: <ContractIcon />,
        });
      }
    });

    // Search in payments
    payments?.forEach((payment) => {
      if (
        payment.property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.tenantName.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        searchResults.push({
          id: payment.id,
          type: 'payment',
          title: `${payment.property.address} - ${payment.tenantName}`,
          subtitle: 'Pago',
          icon: <PaymentIcon />,
        });
      }
    });

    // Search in messages
    messagesData?.results?.forEach((message: any) => {
      if (
        message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.sender_name?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        searchResults.push({
          id: message.id,
          type: 'message',
          title: `${message.sender_name || 'Unknown'} - ${message.content.substring(0, 50)}`,
          subtitle: 'Mensaje',
          icon: <MessageIcon />,
        });
      }
    });

    setResults(searchResults);
    setIsLoading(false);
  }, [searchTerm, properties, contracts, payments, messagesData]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setAnchorEl(event.currentTarget);
  };

  const handleResultClick = (result: SearchResult) => {
    setSearchTerm('');
    setResults([]);
    setAnchorEl(null);

    switch (result.type) {
      case 'property':
        navigate(`/properties/${result.id}`);
        break;
      case 'contract':
        navigate(`/contracts/${result.id}`);
        break;
      case 'payment':
        navigate(`/payments/${result.id}`);
        break;
      case 'message':
        navigate(`/messages/${result.id}`);
        break;
    }
  };

  const handleClickAway = () => {
    setResults([]);
    setAnchorEl(null);
  };

  if (!isAuthenticated) return null;

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box ref={searchRef} sx={{ position: 'relative', width: '100%', maxWidth: 600 }}>
        <TextField
          fullWidth
          placeholder="Buscar..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
        <Popper
          open={Boolean(anchorEl) && (results.length > 0 || isLoading)}
          anchorEl={anchorEl}
          placement="bottom-start"
          style={{ width: searchRef.current?.offsetWidth }}
        >
          <Paper elevation={3} sx={{ mt: 1, maxHeight: 400, overflow: 'auto' }}>
            {isLoading ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <List>
                {results.map((result) => (
                  <ListItem
                    button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                  >
                    <ListItemIcon>{result.icon}</ListItemIcon>
                    <ListItemText
                      primary={result.title}
                      secondary={result.subtitle}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
};

export default GlobalSearch; 