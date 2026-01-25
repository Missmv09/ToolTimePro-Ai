// ToolTime Pro Database Types
// Auto-generated from database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          logo_url: string | null
          plan: string
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          logo_url?: string | null
          plan?: string
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          logo_url?: string | null
          plan?: string
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          company_id: string | null
          email: string
          full_name: string
          phone: string | null
          role: 'owner' | 'admin' | 'worker'
          hourly_rate: number | null
          is_active: boolean
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_id?: string | null
          email: string
          full_name: string
          phone?: string | null
          role?: 'owner' | 'admin' | 'worker'
          hourly_rate?: number | null
          is_active?: boolean
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          email?: string
          full_name?: string
          phone?: string | null
          role?: 'owner' | 'admin' | 'worker'
          hourly_rate?: number | null
          is_active?: boolean
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          company_id: string | null
          name: string
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          notes: string | null
          source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          notes?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          notes?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          company_id: string | null
          name: string
          description: string | null
          default_price: number | null
          price_type: 'fixed' | 'hourly' | 'per_sqft'
          duration_minutes: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          name: string
          description?: string | null
          default_price?: number | null
          price_type?: 'fixed' | 'hourly' | 'per_sqft'
          duration_minutes?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          name?: string
          description?: string | null
          default_price?: number | null
          price_type?: 'fixed' | 'hourly' | 'per_sqft'
          duration_minutes?: number
          is_active?: boolean
          created_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          company_id: string | null
          customer_id: string | null
          name: string
          email: string | null
          phone: string | null
          address: string | null
          service_requested: string | null
          message: string | null
          source: string
          status: 'new' | 'contacted' | 'quoted' | 'won' | 'lost'
          estimated_value: number | null
          follow_up_date: string | null
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          customer_id?: string | null
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          service_requested?: string | null
          message?: string | null
          source?: string
          status?: 'new' | 'contacted' | 'quoted' | 'won' | 'lost'
          estimated_value?: number | null
          follow_up_date?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          customer_id?: string | null
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          service_requested?: string | null
          message?: string | null
          source?: string
          status?: 'new' | 'contacted' | 'quoted' | 'won' | 'lost'
          estimated_value?: number | null
          follow_up_date?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          company_id: string | null
          customer_id: string | null
          quote_id: string | null
          title: string
          description: string | null
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          scheduled_date: string | null
          scheduled_time_start: string | null
          scheduled_time_end: string | null
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          priority: 'low' | 'normal' | 'high' | 'urgent'
          total_amount: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          customer_id?: string | null
          quote_id?: string | null
          title: string
          description?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          scheduled_date?: string | null
          scheduled_time_start?: string | null
          scheduled_time_end?: string | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          total_amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          customer_id?: string | null
          quote_id?: string | null
          title?: string
          description?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          scheduled_date?: string | null
          scheduled_time_start?: string | null
          scheduled_time_end?: string | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          total_amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      time_entries: {
        Row: {
          id: string
          company_id: string | null
          user_id: string | null
          job_id: string | null
          clock_in: string
          clock_out: string | null
          clock_in_location: Json | null
          clock_out_location: Json | null
          clock_in_photo_url: string | null
          clock_out_photo_url: string | null
          break_minutes: number
          notes: string | null
          status: 'active' | 'completed' | 'edited'
          attestation_completed: boolean
          attestation_at: string | null
          attestation_signature: string | null
          missed_meal_break: boolean
          missed_meal_reason: string | null
          missed_rest_break: boolean
          missed_rest_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          user_id?: string | null
          job_id?: string | null
          clock_in: string
          clock_out?: string | null
          clock_in_location?: Json | null
          clock_out_location?: Json | null
          clock_in_photo_url?: string | null
          clock_out_photo_url?: string | null
          break_minutes?: number
          notes?: string | null
          status?: 'active' | 'completed' | 'edited'
          attestation_completed?: boolean
          attestation_at?: string | null
          attestation_signature?: string | null
          missed_meal_break?: boolean
          missed_meal_reason?: string | null
          missed_rest_break?: boolean
          missed_rest_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          user_id?: string | null
          job_id?: string | null
          clock_in?: string
          clock_out?: string | null
          clock_in_location?: Json | null
          clock_out_location?: Json | null
          clock_in_photo_url?: string | null
          clock_out_photo_url?: string | null
          break_minutes?: number
          notes?: string | null
          status?: 'active' | 'completed' | 'edited'
          attestation_completed?: boolean
          attestation_at?: string | null
          attestation_signature?: string | null
          missed_meal_break?: boolean
          missed_meal_reason?: string | null
          missed_rest_break?: boolean
          missed_rest_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      breaks: {
        Row: {
          id: string
          time_entry_id: string | null
          user_id: string | null
          break_type: 'meal' | 'rest'
          break_start: string
          break_end: string | null
          waived: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          time_entry_id?: string | null
          user_id?: string | null
          break_type: 'meal' | 'rest'
          break_start: string
          break_end?: string | null
          waived?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          time_entry_id?: string | null
          user_id?: string | null
          break_type?: 'meal' | 'rest'
          break_start?: string
          break_end?: string | null
          waived?: boolean
          notes?: string | null
          created_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          company_id: string | null
          customer_id: string | null
          lead_id: string | null
          quote_number: string | null
          title: string | null
          description: string | null
          subtotal: number
          tax_rate: number
          tax_amount: number
          discount_amount: number
          total: number
          status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'expired'
          valid_until: string | null
          sent_at: string | null
          viewed_at: string | null
          approved_at: string | null
          signature_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          customer_id?: string | null
          lead_id?: string | null
          quote_number?: string | null
          title?: string | null
          description?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount_amount?: number
          total?: number
          status?: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'expired'
          valid_until?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          approved_at?: string | null
          signature_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          customer_id?: string | null
          lead_id?: string | null
          quote_number?: string | null
          title?: string | null
          description?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount_amount?: number
          total?: number
          status?: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'expired'
          valid_until?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          approved_at?: string | null
          signature_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          company_id: string | null
          customer_id: string | null
          job_id: string | null
          quote_id: string | null
          invoice_number: string | null
          subtotal: number
          tax_rate: number
          tax_amount: number
          discount_amount: number
          total: number
          amount_paid: number
          status: 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue'
          due_date: string | null
          sent_at: string | null
          paid_at: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          customer_id?: string | null
          job_id?: string | null
          quote_id?: string | null
          invoice_number?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount_amount?: number
          total?: number
          amount_paid?: number
          status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue'
          due_date?: string | null
          sent_at?: string | null
          paid_at?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          customer_id?: string | null
          job_id?: string | null
          quote_id?: string | null
          invoice_number?: string | null
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          discount_amount?: number
          total?: number
          amount_paid?: number
          status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue'
          due_date?: string | null
          sent_at?: string | null
          paid_at?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      incidents: {
        Row: {
          id: string
          company_id: string | null
          job_id: string | null
          user_id: string | null
          incident_type: string
          description: string
          severity: 'low' | 'medium' | 'high' | 'critical'
          status: 'open' | 'investigating' | 'resolved' | 'closed'
          resolution: string | null
          photo_urls: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          job_id?: string | null
          user_id?: string | null
          incident_type: string
          description: string
          severity?: 'low' | 'medium' | 'high' | 'critical'
          status?: 'open' | 'investigating' | 'resolved' | 'closed'
          resolution?: string | null
          photo_urls?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          job_id?: string | null
          user_id?: string | null
          incident_type?: string
          description?: string
          severity?: 'low' | 'medium' | 'high' | 'critical'
          status?: 'open' | 'investigating' | 'resolved' | 'closed'
          resolution?: string | null
          photo_urls?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      compliance_alerts: {
        Row: {
          id: string
          company_id: string | null
          user_id: string | null
          time_entry_id: string | null
          alert_type: 'meal_break_due' | 'meal_break_missed' | 'rest_break_due' | 'overtime_warning' | 'double_time_warning'
          severity: 'info' | 'warning' | 'violation'
          title: string
          description: string | null
          hours_worked: number | null
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          user_id?: string | null
          time_entry_id?: string | null
          alert_type: 'meal_break_due' | 'meal_break_missed' | 'rest_break_due' | 'overtime_warning' | 'double_time_warning'
          severity?: 'info' | 'warning' | 'violation'
          title: string
          description?: string | null
          hours_worked?: number | null
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          user_id?: string | null
          time_entry_id?: string | null
          alert_type?: 'meal_break_due' | 'meal_break_missed' | 'rest_break_due' | 'overtime_warning' | 'double_time_warning'
          severity?: 'info' | 'warning' | 'violation'
          title?: string
          description?: string | null
          hours_worked?: number | null
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
        }
      }
      review_requests: {
        Row: {
          id: string
          company_id: string | null
          job_id: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_email: string | null
          review_link: string | null
          status: 'pending' | 'sent' | 'clicked' | 'reviewed'
          channel: 'sms' | 'email'
          sent_at: string | null
          clicked_at: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          job_id?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_email?: string | null
          review_link?: string | null
          status?: 'pending' | 'sent' | 'clicked' | 'reviewed'
          channel?: 'sms' | 'email'
          sent_at?: string | null
          clicked_at?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          job_id?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_email?: string | null
          review_link?: string | null
          status?: 'pending' | 'sent' | 'clicked' | 'reviewed'
          channel?: 'sms' | 'email'
          sent_at?: string | null
          clicked_at?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
      }
    }
  }
}

// Convenience types
export type Company = Database['public']['Tables']['companies']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Service = Database['public']['Tables']['services']['Row']
export type Lead = Database['public']['Tables']['leads']['Row']
export type Job = Database['public']['Tables']['jobs']['Row']
export type TimeEntry = Database['public']['Tables']['time_entries']['Row']
export type Break = Database['public']['Tables']['breaks']['Row']
export type Quote = Database['public']['Tables']['quotes']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type Incident = Database['public']['Tables']['incidents']['Row']
export type ComplianceAlert = Database['public']['Tables']['compliance_alerts']['Row']
export type ReviewRequest = Database['public']['Tables']['review_requests']['Row']

// Insert types
export type CompanyInsert = Database['public']['Tables']['companies']['Insert']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type ServiceInsert = Database['public']['Tables']['services']['Insert']
export type LeadInsert = Database['public']['Tables']['leads']['Insert']
export type JobInsert = Database['public']['Tables']['jobs']['Insert']
export type TimeEntryInsert = Database['public']['Tables']['time_entries']['Insert']
export type BreakInsert = Database['public']['Tables']['breaks']['Insert']
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type IncidentInsert = Database['public']['Tables']['incidents']['Insert']
export type ComplianceAlertInsert = Database['public']['Tables']['compliance_alerts']['Insert']
export type ReviewRequestInsert = Database['public']['Tables']['review_requests']['Insert']

// Update types
export type CompanyUpdate = Database['public']['Tables']['companies']['Update']
export type UserUpdate = Database['public']['Tables']['users']['Update']
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']
export type ServiceUpdate = Database['public']['Tables']['services']['Update']
export type LeadUpdate = Database['public']['Tables']['leads']['Update']
export type JobUpdate = Database['public']['Tables']['jobs']['Update']
export type TimeEntryUpdate = Database['public']['Tables']['time_entries']['Update']
export type BreakUpdate = Database['public']['Tables']['breaks']['Update']
export type QuoteUpdate = Database['public']['Tables']['quotes']['Update']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']
export type IncidentUpdate = Database['public']['Tables']['incidents']['Update']
export type ComplianceAlertUpdate = Database['public']['Tables']['compliance_alerts']['Update']
export type ReviewRequestUpdate = Database['public']['Tables']['review_requests']['Update']

// Location type for GPS tracking
export interface GeoLocation {
  lat: number
  lng: number
  address?: string
  accuracy?: number
  timestamp?: string
}
