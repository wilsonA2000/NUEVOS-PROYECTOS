/**
 * Tests for adminService (AdminService).
 * Covers contract management (pending, approve, reject),
 * audit/security operations, document access, and circular workflow.
 */

import {
  AdminService,
  getPendingContracts,
  getContractStats,
  getContractForReview,
  approveContract,
  rejectContract,
  reApproveContract,
  getSystemOverview,
  generateAuditReport,
  getSecurityAnalysis,
  exportLogs,
  cleanupLogs,
  getDocumentAccessHistory,
  getContractsInCorrectionCycle,
  getCircularWorkflowHistory,
} from '../adminService';
import { api } from '../api';

// Mock the API module
jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('AdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== CONTRACT MANAGEMENT =====

  describe('getPendingContracts', () => {
    it('should fetch pending contracts and extract array', async () => {
      const contracts = [
        { id: 'c-1', property_address: '123 Main St', days_pending: 3 },
        { id: 'c-2', property_address: '456 Oak Ave', days_pending: 8 },
      ];
      mockedApi.get.mockResolvedValueOnce({ data: { count: 2, contracts } });

      const result = await getPendingContracts();

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/admin/pending/');
      expect(result).toEqual(contracts);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no contracts field', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: {} });

      const result = await getPendingContracts();

      expect(result).toEqual([]);
    });

    it('should propagate errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Forbidden'));

      await expect(getPendingContracts()).rejects.toThrow('Forbidden');
    });
  });

  describe('getContractStats', () => {
    it('should fetch contract statistics', async () => {
      const stats = {
        total_contracts: 50,
        pending_review: 5,
        approved_today: 3,
        rejected_today: 1,
        avg_review_time_hours: 4.5,
        urgent_contracts: 2,
        by_state: { DRAFT: 10, ACTIVE: 30 },
      };
      mockedApi.get.mockResolvedValueOnce({ data: stats });

      const result = await getContractStats();

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/admin/stats/');
      expect(result.total_contracts).toBe(50);
      expect(result.urgent_contracts).toBe(2);
    });
  });

  describe('getContractForReview', () => {
    it('should fetch contract detail for review', async () => {
      const detail = {
        id: 'c-1',
        property_address: '123 Main St',
        landlord_name: 'John',
        clauses: [{ key: 'clause-1', title: 'Payment', content: 'Monthly', is_custom: false }],
        history_entries: [],
      };
      mockedApi.get.mockResolvedValueOnce({ data: detail });

      const result = await getContractForReview('c-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/admin/contracts/c-1/');
      expect(result.clauses).toHaveLength(1);
    });
  });

  describe('approveContract', () => {
    it('should approve a contract with notes', async () => {
      const response = { success: true, message: 'Approved', new_state: 'DRAFT' };
      mockedApi.post.mockResolvedValueOnce({ data: response });

      const result = await approveContract('c-1', { notes: 'Looks good' });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/admin/contracts/c-1/approve/',
        { notes: 'Looks good' },
      );
      expect(result.success).toBe(true);
      expect(result.new_state).toBe('DRAFT');
    });

    it('should approve without payload', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { success: true, message: 'OK', new_state: 'DRAFT' } });

      await approveContract('c-1');

      expect(mockedApi.post).toHaveBeenCalledWith('/contracts/admin/contracts/c-1/approve/', {});
    });
  });

  describe('rejectContract', () => {
    it('should reject a contract with required notes', async () => {
      const payload = { notes: 'Missing clauses', requires_resubmission: true };
      const response = { success: true, message: 'Rejected', new_state: 'LANDLORD_EDITING' };
      mockedApi.post.mockResolvedValueOnce({ data: response });

      const result = await rejectContract('c-1', payload);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/admin/contracts/c-1/reject/',
        payload,
      );
      expect(result.success).toBe(true);
    });

    it('should propagate errors on rejection', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Contract locked'));

      await expect(
        rejectContract('c-1', { notes: 'Bad', requires_resubmission: false }),
      ).rejects.toThrow('Contract locked');
    });
  });

  describe('reApproveContract', () => {
    it('should re-approve a contract after corrections', async () => {
      const response = { success: true, message: 'Re-approved', new_state: 'DRAFT', cycle: 2 };
      mockedApi.post.mockResolvedValueOnce({ data: response });

      const result = await reApproveContract('c-1', { notes: 'Corrections look good' });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/contracts/admin/contracts/c-1/re-approve/',
        { notes: 'Corrections look good' },
      );
      expect(result.cycle).toBe(2);
    });
  });

  // ===== AUDIT & SECURITY =====

  describe('getSystemOverview', () => {
    it('should fetch system overview', async () => {
      const overview = {
        users: { total: 100, active_today: 25, new_this_month: 10, by_type: {} },
        contracts: { total: 50, active: 30, pending_review: 5, completed_this_month: 8 },
        properties: { total: 200, available: 150, rented: 50 },
        payments: { total_volume: 50000000, pending: 5, completed_this_month: 20 },
        system_health: {
          api_latency_ms: 45,
          database_status: 'healthy',
          cache_status: 'healthy',
          websocket_status: 'healthy',
        },
      };
      mockedApi.get.mockResolvedValueOnce({ data: overview });

      const result = await getSystemOverview();

      expect(mockedApi.get).toHaveBeenCalledWith('/core/stats/overview/');
      expect(result.users.total).toBe(100);
      expect(result.system_health.database_status).toBe('healthy');
    });
  });

  describe('generateAuditReport', () => {
    it('should generate an audit report', async () => {
      const request = {
        date_from: '2025-01-01',
        date_to: '2025-12-31',
        include_sections: ['contracts', 'users'],
        format: 'json' as const,
      };
      const response = {
        report_id: 'r-1',
        generated_at: '2025-12-01T00:00:00Z',
        date_range: { from: '2025-01-01', to: '2025-12-31' },
        sections: {},
      };
      mockedApi.post.mockResolvedValueOnce({ data: response });

      const result = await generateAuditReport(request);

      expect(mockedApi.post).toHaveBeenCalledWith('/core/audit/report/', request);
      expect(result.report_id).toBe('r-1');
    });
  });

  describe('getSecurityAnalysis', () => {
    it('should fetch security analysis', async () => {
      const analysis = {
        risk_score: 25,
        suspicious_ips: [],
        recent_failed_logins: [],
        active_alerts: [
          { id: 'a-1', type: 'brute_force', message: 'Alert', severity: 'medium', created_at: '2025-01-01' },
        ],
      };
      mockedApi.get.mockResolvedValueOnce({ data: analysis });

      const result = await getSecurityAnalysis();

      expect(mockedApi.get).toHaveBeenCalledWith('/core/security/analysis/');
      expect(result.risk_score).toBe(25);
      expect(result.active_alerts).toHaveLength(1);
    });
  });

  describe('exportLogs', () => {
    it('should export logs with parameters', async () => {
      const params = { date_from: '2025-01-01', date_to: '2025-06-30', format: 'csv' as const };
      const response = { download_url: 'https://example.com/logs.csv', records_count: 1500 };
      mockedApi.post.mockResolvedValueOnce({ data: response });

      const result = await exportLogs(params);

      expect(mockedApi.post).toHaveBeenCalledWith('/core/logs/export/', params);
      expect(result.download_url).toBeDefined();
      expect(result.records_count).toBe(1500);
    });
  });

  describe('cleanupLogs', () => {
    it('should cleanup logs with dry run', async () => {
      const params = { retention_days: 90, dry_run: true };
      const response = { records_deleted: 500, space_freed_mb: 12.5, dry_run: true };
      mockedApi.post.mockResolvedValueOnce({ data: response });

      const result = await cleanupLogs(params);

      expect(mockedApi.post).toHaveBeenCalledWith('/core/logs/cleanup/', params);
      expect(result.dry_run).toBe(true);
      expect(result.records_deleted).toBe(500);
    });
  });

  // ===== DOCUMENT ACCESS =====

  describe('getDocumentAccessHistory', () => {
    it('should fetch document access history', async () => {
      const history = {
        document_id: 'doc-1',
        document_type: 'contract',
        is_locked: false,
        total_accesses: 5,
        access_history: [
          {
            id: 'ah-1',
            user_email: 'admin@test.com',
            user_name: 'Admin',
            action: 'view',
            action_display: 'Viewed',
            ip_address: '192.168.1.1',
            timestamp: '2025-01-01T12:00:00Z',
          },
        ],
      };
      mockedApi.get.mockResolvedValueOnce({ data: history });

      const result = await getDocumentAccessHistory('doc-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/documents/doc-1/access-history/');
      expect(result.total_accesses).toBe(5);
      expect(result.access_history).toHaveLength(1);
    });
  });

  // ===== CIRCULAR WORKFLOW =====

  describe('getContractsInCorrectionCycle', () => {
    it('should fetch contracts in correction cycle', async () => {
      const contracts = [{ id: 'c-1', days_pending: 10 }];
      mockedApi.get.mockResolvedValueOnce({ data: contracts });

      const result = await getContractsInCorrectionCycle();

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/admin/correction-cycle/');
      expect(result).toHaveLength(1);
    });
  });

  describe('getCircularWorkflowHistory', () => {
    it('should fetch workflow history for a contract', async () => {
      const history = {
        contract_id: 'c-1',
        review_cycle_count: 2,
        total_days_in_review: 14,
        history: [
          {
            cycle: 1,
            events: [
              { action: 'submitted', user_email: 'landlord@test.com', timestamp: '2025-01-01' },
              { action: 'rejected', user_email: 'admin@test.com', timestamp: '2025-01-02', notes: 'Fix clauses' },
            ],
          },
        ],
      };
      mockedApi.get.mockResolvedValueOnce({ data: history });

      const result = await getCircularWorkflowHistory('c-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/contracts/admin/contracts/c-1/workflow-history/');
      expect(result.review_cycle_count).toBe(2);
      expect(result.history[0].events).toHaveLength(2);
    });
  });

  // ===== ADMIN SERVICE OBJECT =====

  describe('AdminService object', () => {
    it('should expose all contract methods', () => {
      expect(AdminService.getPendingContracts).toBe(getPendingContracts);
      expect(AdminService.getContractStats).toBe(getContractStats);
      expect(AdminService.getContractForReview).toBe(getContractForReview);
      expect(AdminService.approveContract).toBe(approveContract);
      expect(AdminService.rejectContract).toBe(rejectContract);
      expect(AdminService.reApproveContract).toBe(reApproveContract);
    });

    it('should expose all audit and security methods', () => {
      expect(AdminService.getSystemOverview).toBe(getSystemOverview);
      expect(AdminService.generateAuditReport).toBe(generateAuditReport);
      expect(AdminService.getSecurityAnalysis).toBe(getSecurityAnalysis);
      expect(AdminService.exportLogs).toBe(exportLogs);
      expect(AdminService.cleanupLogs).toBe(cleanupLogs);
    });

    it('should expose document access method', () => {
      expect(AdminService.getDocumentAccessHistory).toBe(getDocumentAccessHistory);
    });
  });

  // ===== ERROR HANDLING =====

  describe('Error Handling', () => {
    it('should propagate errors on getPendingContracts', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(getPendingContracts()).rejects.toThrow('Unauthorized');
    });

    it('should propagate errors on approveContract', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Contract already approved'));

      await expect(approveContract('c-1')).rejects.toThrow('Contract already approved');
    });

    it('should propagate errors on getSystemOverview', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Server Error'));

      await expect(getSystemOverview()).rejects.toThrow('Server Error');
    });
  });
});
