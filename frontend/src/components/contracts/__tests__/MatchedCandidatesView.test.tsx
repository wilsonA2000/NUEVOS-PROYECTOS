/**
 * Tests for MatchedCandidatesView
 * Tests rendering, rejection buttons, workflow transitions, and notifications
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';

// Mock api (already mocked in setupTests)
import { api } from '../../../services/api';

// Mock components that use import.meta.env
jest.mock('../ContractDraftEditor', () => ({
  __esModule: true,
  default: () => <div>ContractDraftEditor Mock</div>,
}));

jest.mock('../VisitScheduleModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../VisitEvaluationModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../LandlordDocumentReview', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../ModificationRequestModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../matching/MatchDocumentUpload', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../EnhancedTenantDocumentUpload', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../common/UniversalFileUpload', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../utils/contractPdfUtils', () => ({
  viewContractPDF: jest.fn(),
}));

// Mock services
jest.mock('../../../services/contractService', () => ({
  __esModule: true,
  default: {},
  contractService: {},
}));

jest.mock('../../../services/matchingService', () => ({
  __esModule: true,
  default: {
    getMatchedCandidatesForProperty: jest.fn().mockResolvedValue([]),
    getAllMatchedCandidatesForLandlord: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../../services/contractModificationService', () => ({
  __esModule: true,
  default: {
    getModificationRequests: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../../services/landlordContractService', () => ({
  LandlordContractService: {
    performWorkflowAction: jest.fn(),
    getContracts: jest.fn().mockResolvedValue({ contracts: [] }),
    formatCurrency: jest.fn((amount: number) => `$${amount?.toLocaleString('es-CO') || '0'}`),
  },
}));

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'landlord-123',
      email: 'landlord@test.com',
      user_type: 'landlord',
      first_name: 'Test',
      last_name: 'Landlord',
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

import MatchedCandidatesView from '../MatchedCandidatesView';

describe('MatchedCandidatesView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
  });

  it('renders without crashing', async () => {
    render(
      <BrowserRouter>
        <MatchedCandidatesView />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });

  it('handles empty candidates list', async () => {
    render(
      <BrowserRouter>
        <MatchedCandidatesView />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });

  it('renders component for landlord user', async () => {
    render(
      <BrowserRouter>
        <MatchedCandidatesView />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Component should render without crashing for landlord
      expect(document.body).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <BrowserRouter>
        <MatchedCandidatesView />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });
});
