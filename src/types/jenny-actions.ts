// Jenny Autonomous Actions Types
// "AI that acts, not just answers"

export type JennyActionType =
  | 'auto_dispatch'
  | 'lead_follow_up'
  | 'cash_flow_alert'
  | 'job_costing'
  | 'review_request'
  | 'price_staleness'
  | 'hr_law_update'
  | 'cert_expiration'
  | 'insurance_expiry'
  | 'w9_compliance'
  | 'classification_review'
  | 'compliance_escalation'
  | 'quote_expiration'
  | 'contractor_payment'
  | 'contract_end_date';

export type ActionStatus = 'pending' | 'executed' | 'skipped' | 'failed';

export interface JennyActionLog {
  id: string;
  company_id: string;
  action_type: JennyActionType;
  title: string;
  description: string;
  status: ActionStatus;
  target_id: string | null; // job_id, lead_id, invoice_id, etc.
  target_type: string | null; // 'job', 'lead', 'invoice'
  target_name: string | null;
  result: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  executed_at: string | null;
}

export interface JennyActionConfig {
  id: string;
  company_id: string;
  action_type: JennyActionType;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Auto-Dispatch Config
export interface AutoDispatchConfig {
  enabled: boolean;
  notify_worker_sms: boolean;
  notify_customer_sms: boolean;
  assign_strategy: 'nearest' | 'least_busy' | 'round_robin';
  require_approval: boolean; // If true, Jenny suggests but doesn't assign
}

// Lead Follow-Up Config
export interface LeadFollowUpConfig {
  enabled: boolean;
  follow_up_days: number[]; // e.g. [3, 7, 14]
  channel: 'sms' | 'email' | 'both';
  max_attempts: number;
  messages: {
    day: number;
    sms_template: string;
    email_subject: string;
    email_body: string;
  }[];
}

// Cash Flow Alert Config
export interface CashFlowAlertConfig {
  enabled: boolean;
  overdue_threshold_days: number; // Alert after X days overdue
  notify_owner_sms: boolean;
  auto_send_reminder: boolean; // Auto-send payment reminder to customer
  reminder_intervals_days: number[]; // e.g. [1, 7, 14] days after due
}

// Job Costing Config
export interface JobCostingConfig {
  enabled: boolean;
  alert_threshold_percent: number; // Alert if profit below X% of quote
  include_labor: boolean;
  include_materials: boolean;
  notify_owner: boolean;
}

// HR Law Update Config
export interface HrLawUpdateConfig {
  enabled: boolean;
  stale_threshold_months: number; // Alert when rules older than X months
  notify_owner: boolean;
  states: string[]; // Empty = check all enabled states
}

// Cert/License Expiration Config
export interface CertExpirationConfig {
  enabled: boolean;
  warn_days_before: number[]; // e.g. [60, 30, 14] days before expiry
  notify_owner: boolean;
  notify_worker: boolean;
}

// Contractor Insurance Expiry Config
export interface InsuranceExpiryConfig {
  enabled: boolean;
  warn_days_before: number; // Alert X days before expiry
  block_assignments: boolean; // Block job assignments if expired
}

// W-9 Compliance Config
export interface W9ComplianceConfig {
  enabled: boolean;
  block_payments: boolean; // Block payments until W-9 received
}

// Classification Review Config
export interface ClassificationReviewConfig {
  enabled: boolean;
  review_interval_months: number; // Default 6 months
}

// Compliance Escalation Config
export interface ComplianceEscalationConfig {
  enabled: boolean;
  escalate_after_days: number; // Auto-escalate unacknowledged violations after X days
  escalate_severity: ('warning' | 'violation')[]; // Which severities to escalate
}

// Quote Expiration Config
export interface QuoteExpirationConfig {
  enabled: boolean;
  warn_days_before: number[]; // e.g. [7, 3, 1] days before expiry
  auto_expire: boolean; // Auto-mark as expired
}

// Contractor Payment Config
export interface ContractorPaymentConfig {
  enabled: boolean;
  remind_after_days: number; // Remind owner X days after invoice submitted
}

// Contract End Date Config
export interface ContractEndDateConfig {
  enabled: boolean;
  warn_days_before: number[]; // e.g. [30, 14, 7] days before end
}

// Default configs for new companies
export const DEFAULT_ACTION_CONFIGS: Record<JennyActionType, Record<string, unknown>> = {
  auto_dispatch: {
    enabled: false,
    notify_worker_sms: true,
    notify_customer_sms: true,
    assign_strategy: 'least_busy',
    require_approval: true,
  } satisfies AutoDispatchConfig,

  lead_follow_up: {
    enabled: false,
    follow_up_days: [3, 7, 14],
    channel: 'sms',
    max_attempts: 3,
    messages: [
      {
        day: 3,
        sms_template: "Hi {customer_name}, this is {company_name}. We sent you a quote for {service} a few days ago. Would you like to move forward? Reply YES to confirm or call us at {phone}.",
        email_subject: "Following up on your {service} quote",
        email_body: "",
      },
      {
        day: 7,
        sms_template: "Hi {customer_name}, just checking in from {company_name}. Your quote for {service} is still available. Any questions? We're happy to help — {phone}.",
        email_subject: "Your {service} quote is still available",
        email_body: "",
      },
      {
        day: 14,
        sms_template: "Hi {customer_name}, last follow-up from {company_name} about your {service} project. If you're still interested, we'd love to help. Call or text us anytime — {phone}.",
        email_subject: "Last follow-up: {service} quote from {company_name}",
        email_body: "",
      },
    ],
  } satisfies LeadFollowUpConfig,

  cash_flow_alert: {
    enabled: false,
    overdue_threshold_days: 1,
    notify_owner_sms: true,
    auto_send_reminder: false,
    reminder_intervals_days: [1, 7, 14],
  } satisfies CashFlowAlertConfig,

  job_costing: {
    enabled: false,
    alert_threshold_percent: 20,
    include_labor: true,
    include_materials: true,
    notify_owner: true,
  } satisfies JobCostingConfig,

  review_request: {
    enabled: false,
  },

  price_staleness: {
    enabled: true,
  },

  hr_law_update: {
    enabled: true,
    stale_threshold_months: 6,
    notify_owner: true,
    states: [], // Empty = all enabled states
  } satisfies HrLawUpdateConfig,

  cert_expiration: {
    enabled: true,
    warn_days_before: [60, 30, 14],
    notify_owner: true,
    notify_worker: true,
  } satisfies CertExpirationConfig,

  insurance_expiry: {
    enabled: true,
    warn_days_before: 14,
    block_assignments: true,
  } satisfies InsuranceExpiryConfig,

  w9_compliance: {
    enabled: true,
    block_payments: true,
  } satisfies W9ComplianceConfig,

  classification_review: {
    enabled: true,
    review_interval_months: 6,
  } satisfies ClassificationReviewConfig,

  compliance_escalation: {
    enabled: true,
    escalate_after_days: 3,
    escalate_severity: ['violation'],
  } satisfies ComplianceEscalationConfig,

  quote_expiration: {
    enabled: true,
    warn_days_before: [7, 3, 1],
    auto_expire: true,
  } satisfies QuoteExpirationConfig,

  contractor_payment: {
    enabled: true,
    remind_after_days: 3,
  } satisfies ContractorPaymentConfig,

  contract_end_date: {
    enabled: true,
    warn_days_before: [30, 14, 7],
  } satisfies ContractEndDateConfig,
};

// Action descriptions for the dashboard
export const ACTION_DESCRIPTIONS: Record<JennyActionType, { title: string; description: string; icon: string }> = {
  auto_dispatch: {
    title: 'Auto-Dispatch',
    description: 'When a lead books online, Jenny assigns the nearest available crew, sends confirmations, and updates the schedule — zero human input.',
    icon: 'Zap',
  },
  lead_follow_up: {
    title: 'Smart Follow-Up',
    description: 'Automatically re-engage cold leads after 3, 7, and 14 days with personalized SMS. Never lose a lead to silence.',
    icon: 'MessageSquare',
  },
  cash_flow_alert: {
    title: 'Cash Flow Alerts',
    description: '"You have $4,200 in overdue invoices. Want me to send reminders now?" Proactive alerts on overdue payments.',
    icon: 'DollarSign',
  },
  job_costing: {
    title: 'Job Costing',
    description: 'After a job completes, Jenny calculates actual profit vs. quoted price and flags unprofitable patterns.',
    icon: 'TrendingUp',
  },
  review_request: {
    title: 'Review Requests',
    description: 'Automatically request Google reviews from happy customers after job completion.',
    icon: 'Star',
  },
  price_staleness: {
    title: 'Price Staleness Check',
    description: 'Monthly check of material pricing freshness. Alerts when prices are approaching 1 year old and need refreshing.',
    icon: 'Tag',
  },
  hr_law_update: {
    title: 'HR Law Update Check',
    description: 'Weekly check of state employment law freshness. Alerts when compliance rules (wages, classification tests, break requirements) are older than 6 months and may need review.',
    icon: 'Scale',
  },
  cert_expiration: {
    title: 'Certification Expiration Alerts',
    description: 'Monthly check of worker certifications (OSHA, EPA, journeyman licenses). Alerts 60, 30, and 14 days before expiration to prevent work stoppages.',
    icon: 'Award',
  },
  insurance_expiry: {
    title: 'Contractor Insurance Expiry',
    description: 'Weekly check for 1099 contractors with insurance expiring within 14 days. Prevents liability exposure from uninsured workers.',
    icon: 'Shield',
  },
  w9_compliance: {
    title: 'W-9 Compliance Check',
    description: 'Weekly scan for 1099 contractors missing W-9 forms. Required before any payments can be issued — critical for tax reporting.',
    icon: 'FileText',
  },
  classification_review: {
    title: 'Classification Review Cycle',
    description: 'Quarterly check for workers whose classification review is overdue. Essential for AB5 compliance and audit trail documentation.',
    icon: 'UserCheck',
  },
  compliance_escalation: {
    title: 'Compliance Alert Escalation',
    description: 'Weekly digest of unacknowledged compliance violations (missed breaks, overtime). Auto-escalates critical violations unresolved after 3 days.',
    icon: 'AlertTriangle',
  },
  quote_expiration: {
    title: 'Quote Expiration Alerts',
    description: 'Daily check for quotes expiring within 7 days. Nudges the sales team to close or refresh quotes before they go stale.',
    icon: 'Clock',
  },
  contractor_payment: {
    title: 'Contractor Payment Reminders',
    description: 'Daily check for submitted contractor invoices awaiting approval. Alerts owners so payments are processed on time.',
    icon: 'CreditCard',
  },
  contract_end_date: {
    title: 'Contract End Date Alerts',
    description: 'Weekly check for contractor agreements ending within 30 days. Triggers offboarding planning or contract renewal conversations.',
    icon: 'Calendar',
  },
};
