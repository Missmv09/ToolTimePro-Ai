// Blended Workforce Management Types
// Supports mixed W-2 employees and 1099 independent contractors

export type WorkerClassification = 'w2_employee' | '1099_contractor';

export type ContractorPaymentMethod = 'invoice' | 'direct_deposit' | 'check';

export interface WorkerProfile {
  id: string;
  user_id: string;
  company_id: string;
  classification: WorkerClassification;

  // W-2 specific fields
  hourly_rate: number | null;
  overtime_eligible: boolean;
  pay_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | null;
  withholding_allowances: number | null;
  filing_status: 'single' | 'married' | 'head_of_household' | null;

  // 1099 specific fields
  business_name: string | null;
  ein_or_ssn_on_file: boolean;
  w9_received: boolean;
  w9_received_date: string | null;
  contractor_rate: number | null;
  contractor_rate_type: 'hourly' | 'per_job' | 'daily' | null;
  payment_method: ContractorPaymentMethod | null;
  payment_terms_days: number | null; // Net 15, Net 30, etc.
  insurance_verified: boolean;
  insurance_expiry: string | null;
  license_number: string | null;
  license_verified: boolean;
  contract_start_date: string | null;
  contract_end_date: string | null;

  // Classification audit trail
  classified_at: string;
  classified_by: string | null;
  classification_method: 'abc_test' | 'manual' | 'imported';
  last_review_date: string | null;
  next_review_date: string | null;

  created_at: string;
  updated_at: string;
}

export interface ClassificationGuardrail {
  id: string;
  company_id: string;
  worker_id: string;
  worker_name: string;
  rule_code: string;
  rule_name: string;
  severity: 'info' | 'warning' | 'violation';
  description: string;
  recommendation: string;
  detected_at: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

// Guardrail rules that detect when a 1099 contractor is being treated like an employee
export const GUARDRAIL_RULES = {
  FIXED_SCHEDULE: {
    code: 'FIXED_SCHEDULE',
    name: 'Fixed Schedule Assignment',
    severity: 'warning' as const,
    description: 'This 1099 contractor has been assigned fixed daily schedules similar to an employee. Independent contractors should control their own work schedule.',
    recommendation: 'Allow the contractor to set their own hours. Provide deadlines instead of schedules.',
  },
  EXCESSIVE_HOURS: {
    code: 'EXCESSIVE_HOURS',
    name: 'Excessive Weekly Hours',
    severity: 'warning' as const,
    description: 'This 1099 contractor is consistently working 40+ hours per week, resembling full-time employment.',
    recommendation: 'Review the scope of work. If ongoing full-time work is needed, consider W-2 classification.',
  },
  OVERTIME_TRACKED: {
    code: 'OVERTIME_TRACKED',
    name: 'Overtime Tracking Applied',
    severity: 'violation' as const,
    description: 'Overtime rules are being applied to a 1099 contractor. Independent contractors are not subject to overtime laws.',
    recommendation: 'Remove overtime tracking for this worker. If overtime protection is needed, reclassify as W-2.',
  },
  BREAK_COMPLIANCE_APPLIED: {
    code: 'BREAK_COMPLIANCE_APPLIED',
    name: 'Employee Break Rules Applied',
    severity: 'warning' as const,
    description: 'Meal/rest break compliance tracking is active for a 1099 contractor. These rules apply only to employees.',
    recommendation: 'Disable break compliance alerts for independent contractors.',
  },
  SINGLE_CLIENT: {
    code: 'SINGLE_CLIENT',
    name: 'Single Client Dependency',
    severity: 'warning' as const,
    description: 'This contractor appears to work exclusively for your company, which is a key indicator of employee status under the ABC test (Prong C).',
    recommendation: 'Verify the contractor serves other clients. Document their independent business activities.',
  },
  TOOLS_PROVIDED: {
    code: 'TOOLS_PROVIDED',
    name: 'Company Tools/Equipment Provided',
    severity: 'info' as const,
    description: 'Company-owned tools or equipment have been assigned to this 1099 contractor.',
    recommendation: 'Independent contractors should use their own tools. Document any equipment arrangements in the contract.',
  },
  NO_W9: {
    code: 'NO_W9',
    name: 'Missing W-9 Form',
    severity: 'violation' as const,
    description: 'No W-9 form is on file for this 1099 contractor. This is required before any payments are made.',
    recommendation: 'Collect a signed W-9 immediately. Do not issue payments without it.',
  },
  NO_CONTRACT: {
    code: 'NO_CONTRACT',
    name: 'Missing Written Contract',
    severity: 'violation' as const,
    description: 'No written contract or agreement is on file for this 1099 contractor.',
    recommendation: 'Execute an independent contractor agreement that clearly defines the scope, deliverables, and payment terms.',
  },
  INSURANCE_EXPIRED: {
    code: 'INSURANCE_EXPIRED',
    name: 'Insurance Coverage Expired',
    severity: 'violation' as const,
    description: 'This contractor\'s insurance coverage has expired. This exposes your business to liability.',
    recommendation: 'Require updated proof of insurance before assigning additional work.',
  },
  REVIEW_OVERDUE: {
    code: 'REVIEW_OVERDUE',
    name: 'Classification Review Overdue',
    severity: 'info' as const,
    description: 'This worker\'s classification has not been reviewed in the recommended timeframe (every 6 months).',
    recommendation: 'Re-run the ABC test to confirm the current classification is still appropriate.',
  },
} as const;

export type GuardrailRuleCode = keyof typeof GUARDRAIL_RULES;

export interface WorkforceStats {
  totalWorkers: number;
  w2Count: number;
  contractorCount: number;
  activeGuardrails: number;
  violationCount: number;
  warningCount: number;
  missingW9Count: number;
  expiredInsuranceCount: number;
  reviewsDue: number;
}

export interface ContractorInvoice {
  id: string;
  company_id: string;
  contractor_id: string;
  contractor_name: string;
  invoice_number: string;
  description: string;
  hours_worked: number | null;
  rate: number;
  rate_type: 'hourly' | 'per_job' | 'daily';
  subtotal: number;
  total: number;
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'disputed';
  submitted_date: string | null;
  approved_date: string | null;
  paid_date: string | null;
  payment_method: ContractorPaymentMethod | null;
  period_start: string;
  period_end: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollSummary {
  period_start: string;
  period_end: string;
  w2_payroll: {
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    double_time_hours: number;
    gross_pay: number;
    worker_count: number;
  };
  contractor_payments: {
    total_invoiced: number;
    total_approved: number;
    total_paid: number;
    contractor_count: number;
  };
  combined_labor_cost: number;
}
