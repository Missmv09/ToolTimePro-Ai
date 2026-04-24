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
          website: string | null
          logo_url: string | null
          plan: string
          addons: string[]
          stripe_customer_id: string | null
          stripe_connect_account_id: string | null
          stripe_connect_onboarded: boolean
          booking_settings: Json | null
          trial_starts_at: string | null
          trial_ends_at: string | null
          subscription_status: string | null
          industry: string | null
          onboarding_completed: boolean
          welcome_email_sent_at: string | null
          is_beta_tester: boolean
          beta_notes: string | null
          payment_instructions: string | null
          default_quote_terms: string | null
          license_number: string | null
          insurance_policy_number: string | null
          insurance_expiration: string | null
          tax_id: string | null
          business_hours: Json | null
          service_area_radius: number | null
          company_description: string | null
          default_hourly_rate: number | null
          quote_approval_settings: Json | null
          preferred_language: string
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
          website?: string | null
          logo_url?: string | null
          plan?: string
          addons?: string[]
          stripe_customer_id?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarded?: boolean
          booking_settings?: Json | null
          trial_starts_at?: string | null
          trial_ends_at?: string | null
          subscription_status?: string | null
          industry?: string | null
          onboarding_completed?: boolean
          welcome_email_sent_at?: string | null
          is_beta_tester?: boolean
          beta_notes?: string | null
          payment_instructions?: string | null
          default_quote_terms?: string | null
          license_number?: string | null
          insurance_policy_number?: string | null
          insurance_expiration?: string | null
          tax_id?: string | null
          business_hours?: Json | null
          service_area_radius?: number | null
          company_description?: string | null
          default_hourly_rate?: number | null
          quote_approval_settings?: Json | null
          preferred_language?: string
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
          website?: string | null
          logo_url?: string | null
          plan?: string
          addons?: string[]
          stripe_customer_id?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarded?: boolean
          booking_settings?: Json | null
          trial_starts_at?: string | null
          trial_ends_at?: string | null
          subscription_status?: string | null
          industry?: string | null
          onboarding_completed?: boolean
          welcome_email_sent_at?: string | null
          is_beta_tester?: boolean
          beta_notes?: string | null
          payment_instructions?: string | null
          default_quote_terms?: string | null
          license_number?: string | null
          insurance_policy_number?: string | null
          insurance_expiration?: string | null
          tax_id?: string | null
          business_hours?: Json | null
          service_area_radius?: number | null
          company_description?: string | null
          default_hourly_rate?: number | null
          quote_approval_settings?: Json | null
          preferred_language?: string
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
          role: 'owner' | 'admin' | 'worker' | 'worker_admin'
          hourly_rate: number | null
          is_active: boolean
          avatar_url: string | null
          pin: string | null
          admin_permissions: Record<string, boolean> | null
          home_address: string | null
          home_city: string | null
          home_lat: number | null
          home_lng: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_id?: string | null
          email: string
          full_name: string
          phone?: string | null
          role?: 'owner' | 'admin' | 'worker' | 'worker_admin'
          hourly_rate?: number | null
          is_active?: boolean
          avatar_url?: string | null
          pin?: string | null
          admin_permissions?: Record<string, boolean> | null
          home_address?: string | null
          home_city?: string | null
          home_lat?: number | null
          home_lng?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          email?: string
          full_name?: string
          phone?: string | null
          role?: 'owner' | 'admin' | 'worker' | 'worker_admin'
          hourly_rate?: number | null
          is_active?: boolean
          avatar_url?: string | null
          pin?: string | null
          admin_permissions?: Record<string, boolean> | null
          home_address?: string | null
          home_city?: string | null
          home_lat?: number | null
          home_lng?: number | null
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
          qbo_id: string | null
          sms_consent: boolean
          sms_consent_date: string | null
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
          qbo_id?: string | null
          sms_consent?: boolean
          sms_consent_date?: string | null
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
          qbo_id?: string | null
          sms_consent?: boolean
          sms_consent_date?: string | null
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
          status: 'new' | 'contacted' | 'quoted' | 'booked' | 'won' | 'lost'
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
          status?: 'new' | 'contacted' | 'quoted' | 'booked' | 'won' | 'lost'
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
          status?: 'new' | 'contacted' | 'quoted' | 'booked' | 'won' | 'lost'
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
          created_by: string | null
          sent_by: string | null
          deposit_required: boolean
          deposit_amount: number | null
          deposit_percentage: number | null
          deposit_paid: boolean
          deposit_paid_at: string | null
          deposit_stripe_payment_id: string | null
          revision_number: number
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
          created_by?: string | null
          sent_by?: string | null
          deposit_required?: boolean
          deposit_amount?: number | null
          deposit_percentage?: number | null
          deposit_paid?: boolean
          deposit_paid_at?: string | null
          deposit_stripe_payment_id?: string | null
          revision_number?: number
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
          created_by?: string | null
          sent_by?: string | null
          deposit_required?: boolean
          deposit_amount?: number | null
          deposit_percentage?: number | null
          deposit_paid?: boolean
          deposit_paid_at?: string | null
          deposit_stripe_payment_id?: string | null
          revision_number?: number
          created_at?: string
          updated_at?: string
        }
      }
      quote_edit_history: {
        Row: {
          id: string
          quote_id: string
          company_id: string
          edited_by: string | null
          revision_number: number
          change_summary: string
          changes: Record<string, { old: unknown; new: unknown }>
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          company_id: string
          edited_by?: string | null
          revision_number?: number
          change_summary: string
          changes?: Record<string, { old: unknown; new: unknown }>
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          company_id?: string
          edited_by?: string | null
          revision_number?: number
          change_summary?: string
          changes?: Record<string, { old: unknown; new: unknown }>
          created_at?: string
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
          qbo_id: string | null
          notes: string | null
          deposit_amount: number
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
          qbo_id?: string | null
          notes?: string | null
          deposit_amount?: number
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
          qbo_id?: string | null
          notes?: string | null
          deposit_amount?: number
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
      qbo_connections: {
        Row: {
          id: string
          user_id: string
          qbo_realm_id: string
          access_token: string
          refresh_token: string
          token_expires_at: string
          connected_at: string
          last_sync_at: string | null
          sync_status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          qbo_realm_id: string
          access_token: string
          refresh_token: string
          token_expires_at: string
          connected_at?: string
          last_sync_at?: string | null
          sync_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          qbo_realm_id?: string
          access_token?: string
          refresh_token?: string
          token_expires_at?: string
          connected_at?: string
          last_sync_at?: string | null
          sync_status?: string
          created_at?: string
        }
      }
      qbo_sync_log: {
        Row: {
          id: string
          user_id: string
          sync_type: string
          direction: string
          record_id: string | null
          qbo_id: string | null
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sync_type: string
          direction: string
          record_id?: string | null
          qbo_id?: string | null
          status: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sync_type?: string
          direction?: string
          record_id?: string | null
          qbo_id?: string | null
          status?: string
          error_message?: string | null
          created_at?: string
        }
      }
      worker_profiles: {
        Row: {
          id: string
          user_id: string
          company_id: string
          classification: 'w2_employee' | '1099_contractor'
          hourly_rate: number | null
          overtime_eligible: boolean
          pay_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | null
          withholding_allowances: number | null
          filing_status: 'single' | 'married' | 'head_of_household' | null
          business_name: string | null
          ein_or_ssn_on_file: boolean
          w9_received: boolean
          w9_received_date: string | null
          contractor_rate: number | null
          contractor_rate_type: 'hourly' | 'per_job' | 'daily' | null
          payment_method: 'invoice' | 'direct_deposit' | 'check' | null
          payment_terms_days: number | null
          insurance_verified: boolean
          insurance_expiry: string | null
          license_number: string | null
          license_verified: boolean
          contract_start_date: string | null
          contract_end_date: string | null
          classified_at: string
          classified_by: string | null
          classification_method: 'abc_test' | 'manual' | 'imported'
          last_review_date: string | null
          next_review_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
          classification: 'w2_employee' | '1099_contractor'
          hourly_rate?: number | null
          overtime_eligible?: boolean
          pay_frequency?: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | null
          withholding_allowances?: number | null
          filing_status?: 'single' | 'married' | 'head_of_household' | null
          business_name?: string | null
          ein_or_ssn_on_file?: boolean
          w9_received?: boolean
          w9_received_date?: string | null
          contractor_rate?: number | null
          contractor_rate_type?: 'hourly' | 'per_job' | 'daily' | null
          payment_method?: 'invoice' | 'direct_deposit' | 'check' | null
          payment_terms_days?: number | null
          insurance_verified?: boolean
          insurance_expiry?: string | null
          license_number?: string | null
          license_verified?: boolean
          contract_start_date?: string | null
          contract_end_date?: string | null
          classified_at?: string
          classified_by?: string | null
          classification_method?: 'abc_test' | 'manual' | 'imported'
          last_review_date?: string | null
          next_review_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string
          classification?: 'w2_employee' | '1099_contractor'
          hourly_rate?: number | null
          overtime_eligible?: boolean
          pay_frequency?: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | null
          withholding_allowances?: number | null
          filing_status?: 'single' | 'married' | 'head_of_household' | null
          business_name?: string | null
          ein_or_ssn_on_file?: boolean
          w9_received?: boolean
          w9_received_date?: string | null
          contractor_rate?: number | null
          contractor_rate_type?: 'hourly' | 'per_job' | 'daily' | null
          payment_method?: 'invoice' | 'direct_deposit' | 'check' | null
          payment_terms_days?: number | null
          insurance_verified?: boolean
          insurance_expiry?: string | null
          license_number?: string | null
          license_verified?: boolean
          contract_start_date?: string | null
          contract_end_date?: string | null
          classified_at?: string
          classified_by?: string | null
          classification_method?: 'abc_test' | 'manual' | 'imported'
          last_review_date?: string | null
          next_review_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      classification_guardrails: {
        Row: {
          id: string
          company_id: string
          worker_id: string
          worker_name: string
          rule_code: string
          rule_name: string
          severity: 'info' | 'warning' | 'violation'
          description: string
          recommendation: string
          detected_at: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          resolution_notes: string | null
        }
        Insert: {
          id?: string
          company_id: string
          worker_id: string
          worker_name: string
          rule_code: string
          rule_name: string
          severity?: 'info' | 'warning' | 'violation'
          description: string
          recommendation: string
          detected_at?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          worker_id?: string
          worker_name?: string
          rule_code?: string
          rule_name?: string
          severity?: 'info' | 'warning' | 'violation'
          description?: string
          recommendation?: string
          detected_at?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
        }
      }
      contractor_invoices: {
        Row: {
          id: string
          company_id: string
          contractor_id: string
          contractor_name: string
          invoice_number: string
          description: string
          hours_worked: number | null
          rate: number
          rate_type: 'hourly' | 'per_job' | 'daily'
          subtotal: number
          total: number
          status: 'draft' | 'submitted' | 'approved' | 'paid' | 'disputed'
          submitted_date: string | null
          approved_date: string | null
          paid_date: string | null
          payment_method: 'invoice' | 'direct_deposit' | 'check' | null
          period_start: string
          period_end: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          contractor_id: string
          contractor_name: string
          invoice_number?: string
          description: string
          hours_worked?: number | null
          rate: number
          rate_type?: 'hourly' | 'per_job' | 'daily'
          subtotal: number
          total: number
          status?: 'draft' | 'submitted' | 'approved' | 'paid' | 'disputed'
          submitted_date?: string | null
          approved_date?: string | null
          paid_date?: string | null
          payment_method?: 'invoice' | 'direct_deposit' | 'check' | null
          period_start: string
          period_end: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          contractor_id?: string
          contractor_name?: string
          invoice_number?: string
          description?: string
          hours_worked?: number | null
          rate?: number
          rate_type?: 'hourly' | 'per_job' | 'daily'
          subtotal?: number
          total?: number
          status?: 'draft' | 'submitted' | 'approved' | 'paid' | 'disputed'
          submitted_date?: string | null
          approved_date?: string | null
          paid_date?: string | null
          payment_method?: 'invoice' | 'direct_deposit' | 'check' | null
          period_start?: string
          period_end?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      saved_routes: {
        Row: {
          id: string
          company_id: string
          name: string
          route_date: string
          worker_id: string | null
          ordered_job_ids: string[]
          route_data: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name?: string
          route_date: string
          worker_id?: string | null
          ordered_job_ids?: string[]
          route_data?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          route_date?: string
          worker_id?: string | null
          ordered_job_ids?: string[]
          route_data?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      route_settings: {
        Row: {
          id: string
          company_id: string
          avg_speed_mph: number
          fuel_cost_per_mile: number
          road_factor: number
          office_lat: number | null
          office_lng: number | null
          office_address: string | null
          time_window_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          avg_speed_mph?: number
          fuel_cost_per_mile?: number
          road_factor?: number
          office_lat?: number | null
          office_lng?: number | null
          office_address?: string | null
          time_window_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          avg_speed_mph?: number
          fuel_cost_per_mile?: number
          road_factor?: number
          office_lat?: number | null
          office_lng?: number | null
          office_address?: string | null
          time_window_enabled?: boolean
          created_at?: string
          updated_at?: string
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
export type QBOConnection = Database['public']['Tables']['qbo_connections']['Row']
export type QBOSyncLog = Database['public']['Tables']['qbo_sync_log']['Row']

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
export type QuoteEditHistory = Database['public']['Tables']['quote_edit_history']['Row']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type IncidentInsert = Database['public']['Tables']['incidents']['Insert']
export type ComplianceAlertInsert = Database['public']['Tables']['compliance_alerts']['Insert']
export type ReviewRequestInsert = Database['public']['Tables']['review_requests']['Insert']
export type QBOConnectionInsert = Database['public']['Tables']['qbo_connections']['Insert']
export type QBOSyncLogInsert = Database['public']['Tables']['qbo_sync_log']['Insert']

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
export type QBOConnectionUpdate = Database['public']['Tables']['qbo_connections']['Update']
export type QBOSyncLogUpdate = Database['public']['Tables']['qbo_sync_log']['Update']

// Workforce management types
export type WorkerProfileRow = Database['public']['Tables']['worker_profiles']['Row']
export type WorkerProfileInsert = Database['public']['Tables']['worker_profiles']['Insert']
export type WorkerProfileUpdate = Database['public']['Tables']['worker_profiles']['Update']
export type ClassificationGuardrailRow = Database['public']['Tables']['classification_guardrails']['Row']
export type ClassificationGuardrailInsert = Database['public']['Tables']['classification_guardrails']['Insert']
export type ClassificationGuardrailUpdate = Database['public']['Tables']['classification_guardrails']['Update']
export type ContractorInvoiceRow = Database['public']['Tables']['contractor_invoices']['Row']
export type ContractorInvoiceInsert = Database['public']['Tables']['contractor_invoices']['Insert']
export type ContractorInvoiceUpdate = Database['public']['Tables']['contractor_invoices']['Update']

// Route optimization types
export type SavedRouteRow = Database['public']['Tables']['saved_routes']['Row']
export type SavedRouteInsert = Database['public']['Tables']['saved_routes']['Insert']
export type SavedRouteUpdate = Database['public']['Tables']['saved_routes']['Update']
export type RouteSettingsRow = Database['public']['Tables']['route_settings']['Row']
export type RouteSettingsInsert = Database['public']['Tables']['route_settings']['Insert']
export type RouteSettingsUpdate = Database['public']['Tables']['route_settings']['Update']

// Location type for GPS tracking
export interface GeoLocation {
  lat: number
  lng: number
  address?: string
  accuracy?: number
  timestamp?: string
}
