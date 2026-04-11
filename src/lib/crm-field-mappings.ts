// CRM Field Mapping Templates
// Maps exported CSV column headers from popular CRMs to ToolTime Pro customer fields

export interface FieldMapping {
  /** ToolTime Pro customer field name */
  target: string;
  /** Human-readable label */
  label: string;
  /** Whether this field is required for import */
  required: boolean;
}

export interface CrmTemplate {
  id: string;
  name: string;
  description: string;
  /** Map of source CSV header (lowercase) -> ToolTime Pro field */
  columnMap: Record<string, string>;
  /** Tips for exporting from this CRM */
  exportInstructions: string[];
}

// All importable fields on the ToolTime Pro customers table
export const TOOLTIME_CUSTOMER_FIELDS: FieldMapping[] = [
  { target: 'name', label: 'Full Name', required: true },
  { target: 'email', label: 'Email', required: false },
  { target: 'phone', label: 'Phone', required: false },
  { target: 'address', label: 'Street Address', required: false },
  { target: 'city', label: 'City', required: false },
  { target: 'state', label: 'State', required: false },
  { target: 'zip', label: 'ZIP Code', required: false },
  { target: 'notes', label: 'Notes', required: false },
  { target: 'source', label: 'Lead Source', required: false },
];

export const CRM_TEMPLATES: Record<string, CrmTemplate> = {
  housecall_pro: {
    id: 'housecall_pro',
    name: 'Housecall Pro',
    description: 'Import customers exported from Housecall Pro',
    columnMap: {
      'customer name': 'name',
      'first name': '_first_name',
      'last name': '_last_name',
      'email': 'email',
      'email address': 'email',
      'phone': 'phone',
      'phone number': 'phone',
      'mobile phone': 'phone',
      'address': 'address',
      'street': 'address',
      'street address': 'address',
      'city': 'city',
      'state': 'state',
      'zip': 'zip',
      'zip code': 'zip',
      'zipcode': 'zip',
      'postal code': 'zip',
      'notes': 'notes',
      'customer notes': 'notes',
      'tags': 'notes',
      'lead source': 'source',
      'source': 'source',
    },
    exportInstructions: [
      'In Housecall Pro, go to Customers from the left sidebar.',
      'Click the "Export" button at the top-right of the customer list.',
      'Select "CSV" as the export format.',
      'Save the file and upload it here.',
    ],
  },

  jobber: {
    id: 'jobber',
    name: 'Jobber',
    description: 'Import customers exported from Jobber',
    columnMap: {
      'client name': 'name',
      'name': 'name',
      'first name': '_first_name',
      'last name': '_last_name',
      'email': 'email',
      'phone number': 'phone',
      'phone': 'phone',
      'mobile number': 'phone',
      'billing address street 1': 'address',
      'street 1': 'address',
      'street address': 'address',
      'address': 'address',
      'billing address city': 'city',
      'city': 'city',
      'billing address province': 'state',
      'state': 'state',
      'province': 'state',
      'billing address postal code': 'zip',
      'postal code': 'zip',
      'zip': 'zip',
      'zip code': 'zip',
      'notes': 'notes',
      'company': 'notes',
      'lead source': 'source',
      'source': 'source',
    },
    exportInstructions: [
      'In Jobber, go to Clients in the left navigation.',
      'Click the gear icon and select "Export clients".',
      'Choose CSV format and download the file.',
      'Upload the exported CSV file here.',
    ],
  },

  servicetitan: {
    id: 'servicetitan',
    name: 'ServiceTitan',
    description: 'Import customers exported from ServiceTitan',
    columnMap: {
      'customer name': 'name',
      'name': 'name',
      'first name': '_first_name',
      'last name': '_last_name',
      'email': 'email',
      'email address': 'email',
      'phone': 'phone',
      'phone number': 'phone',
      'mobile': 'phone',
      'street': 'address',
      'address': 'address',
      'address line 1': 'address',
      'service address': 'address',
      'city': 'city',
      'state': 'state',
      'zip': 'zip',
      'zip code': 'zip',
      'postal code': 'zip',
      'notes': 'notes',
      'customer notes': 'notes',
      'customer type': 'source',
      'source': 'source',
    },
    exportInstructions: [
      'In ServiceTitan, navigate to Reports > Customer Reports.',
      'Select "Customer List" and click "Export".',
      'Choose CSV format and download.',
      'Upload the exported CSV file here.',
    ],
  },

  fieldpulse: {
    id: 'fieldpulse',
    name: 'FieldPulse',
    description: 'Import customers exported from FieldPulse',
    columnMap: {
      'customer name': 'name',
      'name': 'name',
      'first name': '_first_name',
      'last name': '_last_name',
      'email': 'email',
      'phone': 'phone',
      'phone number': 'phone',
      'address': 'address',
      'street': 'address',
      'city': 'city',
      'state': 'state',
      'zip': 'zip',
      'zip code': 'zip',
      'notes': 'notes',
      'source': 'source',
    },
    exportInstructions: [
      'In FieldPulse, go to Contacts > Customers.',
      'Click the "Export" button above the customer list.',
      'Download the CSV file.',
      'Upload the exported CSV file here.',
    ],
  },

  gorilladesk: {
    id: 'gorilladesk',
    name: 'GorillaDesk',
    description: 'Import customers exported from GorillaDesk',
    columnMap: {
      'customer name': 'name',
      'name': 'name',
      'first name': '_first_name',
      'last name': '_last_name',
      'email': 'email',
      'phone': 'phone',
      'address': 'address',
      'city': 'city',
      'state': 'state',
      'zip': 'zip',
      'zip code': 'zip',
      'notes': 'notes',
      'source': 'source',
    },
    exportInstructions: [
      'In GorillaDesk, go to Customers.',
      'Use the Export function to download your customer list as CSV.',
      'Upload the exported CSV file here.',
    ],
  },

  workiz: {
    id: 'workiz',
    name: 'Workiz',
    description: 'Import customers exported from Workiz',
    columnMap: {
      'client name': 'name',
      'name': 'name',
      'first name': '_first_name',
      'last name': '_last_name',
      'email': 'email',
      'phone': 'phone',
      'phone number': 'phone',
      'address': 'address',
      'street': 'address',
      'city': 'city',
      'state': 'state',
      'zip': 'zip',
      'zip code': 'zip',
      'zipcode': 'zip',
      'notes': 'notes',
      'source': 'source',
      'lead source': 'source',
    },
    exportInstructions: [
      'In Workiz, go to Contacts from the sidebar.',
      'Click "Export" to download your client list as CSV.',
      'Upload the exported CSV file here.',
    ],
  },

  generic_csv: {
    id: 'generic_csv',
    name: 'Generic CSV / Spreadsheet',
    description: 'Import from any CSV file — map your columns manually',
    columnMap: {
      'name': 'name',
      'full name': 'name',
      'customer name': 'name',
      'client name': 'name',
      'first name': '_first_name',
      'last name': '_last_name',
      'email': 'email',
      'email address': 'email',
      'phone': 'phone',
      'phone number': 'phone',
      'mobile': 'phone',
      'address': 'address',
      'street': 'address',
      'street address': 'address',
      'city': 'city',
      'state': 'state',
      'province': 'state',
      'zip': 'zip',
      'zip code': 'zip',
      'zipcode': 'zip',
      'postal code': 'zip',
      'notes': 'notes',
      'comments': 'notes',
      'source': 'source',
      'lead source': 'source',
      'referral source': 'source',
    },
    exportInstructions: [
      'Export your customer list as a CSV file from your current system.',
      'Make sure the first row contains column headers.',
      'Upload the CSV file here — we will auto-detect common column names.',
      'You can adjust the field mapping before importing.',
    ],
  },
};

/**
 * Auto-detect which CRM template best matches the CSV headers.
 * Returns the template ID with the highest match count.
 */
export function detectCrmTemplate(headers: string[]): string {
  const normalized = headers.map(h => h.toLowerCase().trim());
  let bestMatch = 'generic_csv';
  let bestScore = 0;

  for (const [templateId, template] of Object.entries(CRM_TEMPLATES)) {
    if (templateId === 'generic_csv') continue;
    const sourceHeaders = Object.keys(template.columnMap);
    const matchCount = normalized.filter(h => sourceHeaders.includes(h)).length;
    if (matchCount > bestScore) {
      bestScore = matchCount;
      bestMatch = templateId;
    }
  }

  // Only use a specific CRM template if we matched at least 3 headers
  return bestScore >= 3 ? bestMatch : 'generic_csv';
}

/**
 * Apply a CRM template's column map to auto-map CSV headers to ToolTime fields.
 * Returns a mapping of csvHeader -> tooltimeField (or 'skip').
 */
export function autoMapHeaders(
  csvHeaders: string[],
  templateId: string
): Record<string, string> {
  const template = CRM_TEMPLATES[templateId] || CRM_TEMPLATES.generic_csv;
  const mapping: Record<string, string> = {};

  for (const header of csvHeaders) {
    const normalized = header.toLowerCase().trim();
    const matched = template.columnMap[normalized];
    mapping[header] = matched || 'skip';
  }

  return mapping;
}

/**
 * Transform a raw CSV row using the provided field mapping.
 * Handles first_name + last_name merging into name.
 */
export function transformRow(
  row: Record<string, string>,
  fieldMapping: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  let firstName = '';
  let lastName = '';

  for (const [csvHeader, tooltimeField] of Object.entries(fieldMapping)) {
    if (tooltimeField === 'skip' || !tooltimeField) continue;

    const value = (row[csvHeader] || '').trim();
    if (!value) continue;

    if (tooltimeField === '_first_name') {
      firstName = value;
    } else if (tooltimeField === '_last_name') {
      lastName = value;
    } else if (tooltimeField === 'name' && !result.name) {
      result.name = value;
    } else if (tooltimeField === 'notes' && result.notes) {
      // Append multiple note-like fields
      result.notes += '; ' + value;
    } else {
      result[tooltimeField] = value;
    }
  }

  // Merge first + last name if no full name was directly mapped
  if (!result.name && (firstName || lastName)) {
    result.name = [firstName, lastName].filter(Boolean).join(' ');
  }

  return result;
}

/**
 * Validate a transformed row. Returns array of error messages (empty = valid).
 */
export function validateRow(row: Record<string, string>): string[] {
  const errors: string[] = [];

  if (!row.name || row.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (row.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      errors.push(`Invalid email: ${row.email}`);
    }
  }

  if (row.phone) {
    const digits = row.phone.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 10) {
      errors.push(`Phone number too short: ${row.phone}`);
    }
  }

  if (row.state && row.state.length > 2) {
    // Try to accept full state names but flag them
    errors.push(`State should be 2-letter abbreviation: ${row.state}`);
  }

  return errors;
}

/**
 * Normalize phone number to (XXX) XXX-XXXX format.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // Handle 11-digit numbers starting with 1 (US country code)
  const clean = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (clean.length !== 10) return phone; // Return as-is if not 10 digits
  return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
}
