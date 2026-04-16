-- Payment plans for installment payments on invoices
CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  customer_id UUID REFERENCES customers(id),
  total_amount DECIMAL(10,2) NOT NULL,
  number_of_installments INTEGER NOT NULL DEFAULT 2,
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'weekly', 'biweekly', 'monthly'
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'cancelled', 'defaulted'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_plan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'waived'
  paid_at TIMESTAMP WITH TIME ZONE,
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_plans_company ON payment_plans(company_id);
CREATE INDEX idx_payment_plans_invoice ON payment_plans(invoice_id);
CREATE INDEX idx_installments_plan ON payment_plan_installments(payment_plan_id);
CREATE INDEX idx_installments_due ON payment_plan_installments(due_date) WHERE status = 'pending';
