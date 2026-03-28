// Jenny Autonomous Actions Types
// "AI that acts, not just answers"

export type JennyActionType =
  | 'auto_dispatch'
  | 'lead_follow_up'
  | 'cash_flow_alert'
  | 'job_costing'
  | 'review_request'
  | 'price_staleness'
  | 'hr_law_update';

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
};
