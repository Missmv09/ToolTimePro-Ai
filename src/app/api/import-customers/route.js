import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * POST /api/import-customers
 *
 * Accepts a JSON body with:
 *   - companyId: string
 *   - sourceCrm: string
 *   - fileName: string
 *   - fieldMapping: Record<string, string>
 *   - rows: Record<string, string>[]   (raw CSV rows as objects)
 *   - skipDuplicates: boolean
 *
 * Validates, transforms, and bulk-inserts customers.
 */
export async function POST(request) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create authenticated client to verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyId, sourceCrm, fileName, fieldMapping, rows, skipDuplicates = true } = body;

    if (!companyId || !rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId, rows' },
        { status: 400 }
      );
    }

    // Verify user belongs to this company
    const { data: userRecord } = await supabaseAuth
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!userRecord || userRecord.company_id !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Transform rows using field mapping
    const validFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'notes', 'source'];
    const transformed = [];
    const errors = [];
    const skipped = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const customer = { company_id: companyId };
      let firstName = '';
      let lastName = '';

      // Apply field mapping
      for (const [csvHeader, tooltimeField] of Object.entries(fieldMapping)) {
        if (!tooltimeField || tooltimeField === 'skip') continue;
        const value = (raw[csvHeader] || '').trim();
        if (!value) continue;

        if (tooltimeField === '_first_name') {
          firstName = value;
        } else if (tooltimeField === '_last_name') {
          lastName = value;
        } else if (validFields.includes(tooltimeField)) {
          if (tooltimeField === 'notes' && customer.notes) {
            customer.notes += '; ' + value;
          } else if (!customer[tooltimeField]) {
            customer[tooltimeField] = value;
          }
        }
      }

      // Merge first + last name
      if (!customer.name && (firstName || lastName)) {
        customer.name = [firstName, lastName].filter(Boolean).join(' ');
      }

      // Normalize phone
      if (customer.phone) {
        const digits = customer.phone.replace(/\D/g, '');
        const clean = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
        if (clean.length === 10) {
          customer.phone = `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
        }
      }

      // Validate
      const rowErrors = [];
      if (!customer.name || customer.name.trim().length === 0) {
        rowErrors.push('Name is required');
      }
      if (customer.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customer.email)) {
          rowErrors.push(`Invalid email: ${customer.email}`);
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row: i + 1, errors: rowErrors, data: raw });
        continue;
      }

      // Set source to CRM name if not mapped
      if (!customer.source) {
        customer.source = `Import: ${sourceCrm || 'CSV'}`;
      }

      transformed.push(customer);
    }

    // Duplicate detection
    let duplicateCount = 0;
    if (skipDuplicates && transformed.length > 0) {
      // Fetch existing customers for this company
      const { data: existing } = await supabaseAuth
        .from('customers')
        .select('name, email, phone')
        .eq('company_id', companyId);

      if (existing && existing.length > 0) {
        const existingSet = new Set();
        for (const c of existing) {
          if (c.email) existingSet.add(`email:${c.email.toLowerCase()}`);
          if (c.phone) existingSet.add(`phone:${c.phone.replace(/\D/g, '')}`);
          if (c.name) existingSet.add(`name:${c.name.toLowerCase()}`);
        }

        const deduped = [];
        for (const customer of transformed) {
          const emailMatch = customer.email && existingSet.has(`email:${customer.email.toLowerCase()}`);
          const phoneMatch = customer.phone && existingSet.has(`phone:${customer.phone.replace(/\D/g, '')}`);

          if (emailMatch || phoneMatch) {
            duplicateCount++;
            skipped.push({ ...customer, reason: 'Duplicate (matched by ' + (emailMatch ? 'email' : 'phone') + ')' });
          } else {
            deduped.push(customer);
          }
        }
        transformed.length = 0;
        transformed.push(...deduped);
      }
    }

    // Bulk insert in batches of 100
    let importedCount = 0;
    const batchSize = 100;
    const insertErrors = [];

    for (let i = 0; i < transformed.length; i += batchSize) {
      const batch = transformed.slice(i, i + batchSize);
      const { error: insertError, data: inserted } = await supabaseAuth
        .from('customers')
        .insert(batch)
        .select('id');

      if (insertError) {
        insertErrors.push({ batch: Math.floor(i / batchSize) + 1, error: insertError.message });
      } else {
        importedCount += (inserted?.length || batch.length);
      }
    }

    // Log the import job
    try {
      await supabaseAuth.from('import_jobs').insert({
        company_id: companyId,
        source_crm: sourceCrm || 'generic_csv',
        file_name: fileName || 'unknown.csv',
        total_rows: rows.length,
        imported_rows: importedCount,
        skipped_rows: skipped.length,
        failed_rows: errors.length,
        field_mapping: fieldMapping,
        status: insertErrors.length > 0 ? 'failed' : 'completed',
        error_log: [...errors.map(e => ({ row: e.row, message: e.errors.join(', ') })), ...insertErrors],
        created_by: user.id,
        completed_at: new Date().toISOString(),
      });
    } catch {
      // import_jobs table may not exist yet — non-critical
      console.warn('Could not log import job (table may not exist yet)');
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rows.length,
        imported: importedCount,
        skipped: skipped.length,
        duplicates: duplicateCount,
        failed: errors.length,
      },
      errors: errors.slice(0, 50), // Limit error detail to 50 rows
      skipped: skipped.slice(0, 50),
      insertErrors,
    });
  } catch (err) {
    console.error('Import error:', err);
    return NextResponse.json(
      { error: 'Import failed: ' + (err.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
