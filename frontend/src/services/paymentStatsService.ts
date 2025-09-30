/**
 * Payment Statistics Service
 * 
 * Advanced payment analytics service for VeriHome frontend.
 * Provides comprehensive payment statistics, ML predictions, and export capabilities.
 */

import { api } from './api';

// Types for payment statistics
export interface PaymentStatsResponse {
  period: {
    start_date: string;
    end_date: string;
    range: string;
    currency: string;
  };
  transaction_summary: {
    total_transactions: number;
    total_amount: number;
    average_transaction: number;
    by_status: Record<string, { count: number; amount: number }>;
    by_type: Record<string, { count: number; amount: number }>;
    by_direction: Record<string, { count: number; amount: number }>;
  };
  revenue_analytics: {
    total_income: number;
    total_expenses: number;
    net_income: number;
    profit_margin: number;
    monthly_breakdown: Array<{
      month: string;
      revenue: number;
      transaction_count: number;
    }>;
    revenue_by_source: Record<string, {
      amount: number;
      count: number;
      percentage: number;
    }>;
  };
  payment_methods: {
    total_methods: number;
    active_methods: number;
    usage_stats: Record<string, {
      usage_count: number;
      total_amount: number;
      success_rate: number;
    }>;
    preferred_method: string | null;
  };
  escrow_analytics: {
    total_escrow_accounts: number;
    total_escrow_amount: number;
    by_status: Record<string, { count: number; amount: number }>;
    average_escrow_amount: number;
  };
  invoice_analytics: {
    issued: {
      count: number;
      total_amount: number;
      paid_amount: number;
      by_status: Record<string, number>;
    };
    received: {
      count: number;
      total_amount: number;
      paid_amount: number;
      by_status: Record<string, number>;
    };
  };
  payment_plans: {
    total_plans: number;
    active_plans: number;
    completed_plans: number;
    completion_rate: number;
    total_planned_amount: number;
    average_plan_amount: number;
  };
  cash_flow: {
    daily_cash_flow: Array<{
      date: string;
      inflow: number;
      outflow: number;
      net_flow: number;
      running_balance: number;
    }>;
    total_inflow: number;
    total_outflow: number;
    net_cash_flow: number;
    final_balance: number;
  };
  trends: {
    weekly_trends: Array<{
      week: string;
      transaction_count: number;
      total_amount: number;
      growth_rate: number;
    }>;
    average_growth_rate: number;
    trend_direction: 'upward' | 'downward' | 'stable';
  };
  comparisons: {
    current_period: {
      transaction_count: number;
      total_amount: number;
      income: number;
      expenses: number;
    };
    previous_period: {
      transaction_count: number;
      total_amount: number;
      income: number;
      expenses: number;
    };
    changes: {
      transaction_count: number;
      total_amount: number;
      income: number;
      expenses: number;
    };
  };
  risk_analytics: {
    failure_rate: number;
    dispute_rate: number;
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high';
  };
  predictions?: {
    next_30_days: {
      predicted_volume: number;
      predicted_transactions: number;
      confidence: number;
    };
    next_90_days: {
      predicted_volume: number;
      predicted_transactions: number;
      confidence: number;
    };
  };
  landlord_analytics?: {
    total_properties: number;
    total_expected_monthly_rent: number;
    collected_rent_period: number;
    collection_rate: number;
    average_rent_per_property: number;
  };
  tenant_analytics?: {
    total_rent_paid: number;
    payment_count: number;
    on_time_payment_rate: number;
    average_monthly_rent: number;
  };
  service_provider_analytics?: {
    total_service_income: number;
    service_transaction_count: number;
    average_service_fee: number;
  };
}

export interface SystemPaymentStatsResponse {
  period: {
    start_date: string;
    end_date: string;
    range: string;
  };
  platform_summary: {
    total_transactions: number;
    completed_transactions: number;
    failed_transactions: number;
    total_volume: number;
    average_transaction_size: number;
    success_rate: number;
  };
  revenue_analytics: {
    total_processed_volume: number;
    estimated_platform_revenue: number;
    average_daily_volume: number;
  };
  user_analytics: {
    active_users: number;
    total_registered_users: number;
  };
  payment_method_performance: Record<string, {
    usage_count: number;
    total_volume: number;
    success_rate: number;
  }>;
  geographic_analytics: {
    by_city: Array<{
      city: string;
      transaction_count: number;
      total_volume: number;
    }>;
  } | { message: string };
  growth_metrics: {
    current_period_volume: number;
    previous_period_volume: number;
    growth_rate: number;
    growth_direction: 'positive' | 'negative' | 'stable';
  };
  health_metrics: {
    health_score: number;
    failure_rate: number;
    dispute_rate: number;
    uptime_estimate: number;
  } | { message: string };
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'excel';
  date_range: '7d' | '30d' | '90d' | '1y';
  include_details: boolean;
}

class PaymentStatsService {
  private baseUrl = '/payments/stats';

  /**
   * Get comprehensive payment statistics for authenticated user
   */
  async getPaymentStats(params?: {
    date_range?: '7d' | '30d' | '90d' | '1y';
    currency?: string;
    predictions?: boolean;
  }): Promise<PaymentStatsResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.date_range) {
        queryParams.append('date_range', params.date_range);
      }
      if (params?.currency) {
        queryParams.append('currency', params.currency);
      }
      if (params?.predictions) {
        queryParams.append('predictions', 'true');
      }

      const url = queryParams.toString() ? 
        `${this.baseUrl}/?${queryParams.toString()}` : 
        `${this.baseUrl}/`;

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      throw error;
    }
  }

  /**
   * Get system-wide payment statistics (admin only)
   */
  async getSystemPaymentStats(params?: {
    date_range?: '7d' | '30d' | '90d' | '1y';
  }): Promise<SystemPaymentStatsResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.date_range) {
        queryParams.append('date_range', params.date_range);
      }

      const url = queryParams.toString() ? 
        `${this.baseUrl}/system/?${queryParams.toString()}` : 
        `${this.baseUrl}/system/`;

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching system payment stats:', error);
      throw error;
    }
  }

  /**
   * Export payment statistics in specified format
   */
  async exportPaymentStats(options: ExportOptions): Promise<Blob> {
    try {
      const response = await api.post(`${this.baseUrl}/export/`, options, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting payment stats:', error);
      throw error;
    }
  }

  /**
   * Get quick payment overview (lightweight version)
   */
  async getQuickOverview(): Promise<{
    total_transactions: number;
    total_volume: number;
    success_rate: number;
    trend_direction: string;
  }> {
    try {
      const stats = await this.getPaymentStats({ date_range: '30d' });
      
      return {
        total_transactions: stats.transaction_summary.total_transactions,
        total_volume: stats.transaction_summary.total_amount,
        success_rate: stats.transaction_summary.by_status['completed'] ? 
          (stats.transaction_summary.by_status['completed'].count / stats.transaction_summary.total_transactions * 100) : 0,
        trend_direction: stats.trends.trend_direction
      };
    } catch (error) {
      console.error('Error fetching quick overview:', error);
      throw error;
    }
  }

  /**
   * Get payment method performance analytics
   */
  async getPaymentMethodAnalytics(): Promise<{
    usage_stats: Record<string, {
      usage_count: number;
      total_amount: number;
      success_rate: number;
    }>;
    preferred_method: string | null;
  }> {
    try {
      const stats = await this.getPaymentStats({ date_range: '90d' });
      return {
        usage_stats: stats.payment_methods.usage_stats,
        preferred_method: stats.payment_methods.preferred_method
      };
    } catch (error) {
      console.error('Error fetching payment method analytics:', error);
      throw error;
    }
  }

  /**
   * Get cash flow analysis
   */
  async getCashFlowAnalysis(dateRange: '7d' | '30d' | '90d' = '30d'): Promise<{
    daily_cash_flow: Array<{
      date: string;
      inflow: number;
      outflow: number;
      net_flow: number;
      running_balance: number;
    }>;
    net_cash_flow: number;
    trend_direction: string;
  }> {
    try {
      const stats = await this.getPaymentStats({ date_range: dateRange });
      return {
        daily_cash_flow: stats.cash_flow.daily_cash_flow,
        net_cash_flow: stats.cash_flow.net_cash_flow,
        trend_direction: stats.trends.trend_direction
      };
    } catch (error) {
      console.error('Error fetching cash flow analysis:', error);
      throw error;
    }
  }

  /**
   * Get revenue analytics with predictions
   */
  async getRevenueAnalyticsWithPredictions(): Promise<{
    current_revenue: {
      total_income: number;
      total_expenses: number;
      net_income: number;
      profit_margin: number;
    };
    predictions?: {
      next_30_days: {
        predicted_volume: number;
        predicted_transactions: number;
        confidence: number;
      };
      next_90_days: {
        predicted_volume: number;
        predicted_transactions: number;
        confidence: number;
      };
    };
    growth_rate: number;
  }> {
    try {
      const stats = await this.getPaymentStats({ 
        date_range: '90d', 
        predictions: true 
      });
      
      return {
        current_revenue: {
          total_income: stats.revenue_analytics.total_income,
          total_expenses: stats.revenue_analytics.total_expenses,
          net_income: stats.revenue_analytics.net_income,
          profit_margin: stats.revenue_analytics.profit_margin
        },
        predictions: stats.predictions,
        growth_rate: stats.trends.average_growth_rate
      };
    } catch (error) {
      console.error('Error fetching revenue analytics with predictions:', error);
      throw error;
    }
  }

  /**
   * Get risk analytics
   */
  async getRiskAnalytics(): Promise<{
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high';
    failure_rate: number;
    dispute_rate: number;
    recommendations: string[];
  }> {
    try {
      const stats = await this.getPaymentStats({ date_range: '90d' });
      
      // Generate recommendations based on risk level
      const recommendations: string[] = [];
      
      if (stats.risk_analytics.risk_level === 'high') {
        recommendations.push('Consider implementing additional fraud detection measures');
        recommendations.push('Review payment method verification processes');
        recommendations.push('Contact high-risk transactions for manual review');
      } else if (stats.risk_analytics.risk_level === 'medium') {
        recommendations.push('Monitor transaction patterns closely');
        recommendations.push('Consider customer education on secure payment practices');
      } else {
        recommendations.push('Maintain current security practices');
        recommendations.push('Continue monitoring for any changes in risk patterns');
      }
      
      return {
        risk_score: stats.risk_analytics.risk_score,
        risk_level: stats.risk_analytics.risk_level,
        failure_rate: stats.risk_analytics.failure_rate,
        dispute_rate: stats.risk_analytics.dispute_rate,
        recommendations
      };
    } catch (error) {
      console.error('Error fetching risk analytics:', error);
      throw error;
    }
  }

  /**
   * Get role-specific analytics
   */
  async getRoleSpecificAnalytics(): Promise<{
    role: string;
    analytics: any;
  }> {
    try {
      const stats = await this.getPaymentStats({ date_range: '90d' });
      
      if (stats.landlord_analytics) {
        return {
          role: 'landlord',
          analytics: stats.landlord_analytics
        };
      } else if (stats.tenant_analytics) {
        return {
          role: 'tenant',
          analytics: stats.tenant_analytics
        };
      } else if (stats.service_provider_analytics) {
        return {
          role: 'service_provider',
          analytics: stats.service_provider_analytics
        };
      }
      
      return {
        role: 'unknown',
        analytics: {}
      };
    } catch (error) {
      console.error('Error fetching role-specific analytics:', error);
      throw error;
    }
  }

  /**
   * Download export file
   */
  downloadExportFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Format currency values
   */
  formatCurrency(amount: number, currency: string = 'COP'): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Format percentage values
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Calculate period-over-period growth
   */
  calculateGrowth(current: number, previous: number): {
    rate: number;
    direction: 'up' | 'down' | 'stable';
    formatted: string;
  } {
    if (previous === 0) {
      return {
        rate: current > 0 ? 100 : 0,
        direction: current > 0 ? 'up' : 'stable',
        formatted: current > 0 ? '+100%' : '0%'
      };
    }
    
    const rate = ((current - previous) / previous) * 100;
    const direction = rate > 0 ? 'up' : rate < 0 ? 'down' : 'stable';
    const formatted = rate >= 0 ? `+${rate.toFixed(1)}%` : `${rate.toFixed(1)}%`;
    
    return { rate, direction, formatted };
  }
}

export const paymentStatsService = new PaymentStatsService();
export default paymentStatsService;