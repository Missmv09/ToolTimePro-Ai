'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  CRM_TEMPLATES,
  TOOLTIME_CUSTOMER_FIELDS,
  detectCrmTemplate,
  autoMapHeaders,
  transformRow,
  validateRow,
  normalizePhone,
} from '@/lib/crm-field-mappings';
import type { CrmTemplate } from '@/lib/crm-field-mappings';
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Download,
  Loader2,
} from 'lucide-react';

type Step = 'select-crm' | 'upload' | 'map-fields' | 'preview' | 'importing' | 'complete';

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
}

interface ImportResult {
  success: boolean;
  summary: {
    totalRows: number;
    imported: number;
    skipped: number;
    duplicates: number;
    failed: number;
  };
  errors: { row: number; errors: string[]; data: Record<string, string> }[];
  skipped: { name?: string; reason: string }[];
}

export default function ImportCustomersPage() {
  const router = useRouter();
  const { user, dbUser, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('select-crm');
  const [selectedCrm, setSelectedCrm] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const companyId = dbUser?.company_id || null;

  // CSV Parser — handles quoted fields, newlines in quotes, etc.
  const parseCSV = useCallback((text: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (current.trim()) lines.push(current);
        current = '';
        if (char === '\r' && text[i + 1] === '\n') i++; // Skip \r\n
      } else {
        current += char;
      }
    }
    if (current.trim()) lines.push(current);

    if (lines.length < 2) {
      return { headers: [], rows: [] };
    }

    const splitRow = (line: string): string[] => {
      const fields: string[] = [];
      let field = '';
      let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (quoted && line[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            quoted = !quoted;
          }
        } else if (ch === ',' && !quoted) {
          fields.push(field.trim());
          field = '';
        } else {
          field += ch;
        }
      }
      fields.push(field.trim());
      return fields;
    };

    const headers = splitRow(lines[0]);
    const rows = lines.slice(1).map(line => {
      const values = splitRow(line);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = values[i] || '';
      });
      return obj;
    });

    return { headers, rows };
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file (.csv)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    setError('');
    setUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { headers, rows } = parseCSV(text);

        if (headers.length === 0 || rows.length === 0) {
          setError('Could not parse CSV file. Make sure the first row contains column headers.');
          setUploading(false);
          return;
        }

        // Auto-detect CRM if not selected
        let crmId = selectedCrm;
        if (!crmId) {
          crmId = detectCrmTemplate(headers);
          setSelectedCrm(crmId);
        }

        // Auto-map headers
        const mapping = autoMapHeaders(headers, crmId);
        setFieldMapping(mapping);

        setParsedData({ headers, rows, fileName: file.name });
        setStep('map-fields');
      } catch {
        setError('Failed to parse CSV file. Please check the format.');
      }
      setUploading(false);
    };
    reader.onerror = () => {
      setError('Failed to read file.');
      setUploading(false);
    };
    reader.readAsText(file);
  }, [parseCSV, selectedCrm]);

  const handleImport = useCallback(async () => {
    if (!parsedData || !companyId) return;

    setStep('importing');
    setError('');

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        setError('Authentication expired. Please log in again.');
        setStep('preview');
        return;
      }

      const response = await fetch('/api/import-customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyId,
          sourceCrm: selectedCrm,
          fileName: parsedData.fileName,
          fieldMapping,
          rows: parsedData.rows,
          skipDuplicates,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Import failed');
        setStep('preview');
        return;
      }

      setImportResult(result);
      setStep('complete');
    } catch {
      setError('Import failed. Please try again.');
      setStep('preview');
    }
  }, [parsedData, companyId, selectedCrm, fieldMapping, skipDuplicates]);

  // Generate preview data
  const getPreviewRows = useCallback(() => {
    if (!parsedData) return [];
    const preview = parsedData.rows.slice(0, 10).map((row, i) => {
      const transformed = transformRow(row, fieldMapping);
      if (transformed.phone) {
        transformed.phone = normalizePhone(transformed.phone);
      }
      const errors = validateRow(transformed);
      return { index: i + 1, raw: row, transformed, errors };
    });
    return preview;
  }, [parsedData, fieldMapping]);

  const getMappedFieldCount = useCallback(() => {
    return Object.values(fieldMapping).filter(v => v && v !== 'skip').length;
  }, [fieldMapping]);

  const getValidRowCount = useCallback(() => {
    if (!parsedData) return 0;
    let valid = 0;
    for (const row of parsedData.rows) {
      const transformed = transformRow(row, fieldMapping);
      const errors = validateRow(transformed);
      if (errors.length === 0) valid++;
    }
    return valid;
  }, [parsedData, fieldMapping]);

  // Auth check
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Customers</h1>
          <p className="text-gray-600 mt-1">
            Migrate your customer data from another CRM or CSV file
          </p>
        </div>
        <Link
          href="/dashboard/customers"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Back to Customers
        </Link>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center mb-8 gap-2">
        {[
          { id: 'select-crm', label: '1. Source' },
          { id: 'upload', label: '2. Upload' },
          { id: 'map-fields', label: '3. Map Fields' },
          { id: 'preview', label: '4. Preview' },
          { id: 'complete', label: '5. Import' },
        ].map((s, i) => {
          const steps: Step[] = ['select-crm', 'upload', 'map-fields', 'preview', 'complete'];
          const currentIdx = steps.indexOf(step === 'importing' ? 'complete' : step);
          const stepIdx = i;
          const isActive = stepIdx === currentIdx;
          const isComplete = stepIdx < currentIdx;

          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && <div className={`h-0.5 w-6 ${isComplete ? 'bg-blue-600' : 'bg-gray-200'}`} />}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isComplete
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isComplete && <CheckCircle2 className="w-4 h-4" />}
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Select CRM */}
      {step === 'select-crm' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Where are you importing from?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(CRM_TEMPLATES).map((template: CrmTemplate) => (
              <button
                key={template.id}
                onClick={() => {
                  setSelectedCrm(template.id);
                  setStep('upload');
                }}
                className={`p-4 border-2 rounded-xl text-left hover:border-blue-500 hover:bg-blue-50 transition-colors ${
                  selectedCrm === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  <span className="font-semibold text-gray-900">{template.name}</span>
                </div>
                <p className="text-sm text-gray-600">{template.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Upload CSV */}
      {step === 'upload' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            Upload your CSV file
            {selectedCrm && CRM_TEMPLATES[selectedCrm] && (
              <span className="text-blue-600 ml-2">from {CRM_TEMPLATES[selectedCrm].name}</span>
            )}
          </h2>

          {/* Export instructions */}
          {selectedCrm && CRM_TEMPLATES[selectedCrm] && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">How to export your data:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                {CRM_TEMPLATES[selectedCrm].exportInstructions.map((instruction, i) => (
                  <li key={i}>{instruction}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Upload area */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
            ) : (
              <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            )}
            <p className="mt-4 text-gray-700 font-medium">
              {uploading ? 'Reading file...' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-sm text-gray-500 mt-1">CSV files only, max 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep('select-crm')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Map Fields */}
      {step === 'map-fields' && parsedData && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Map CSV columns to customer fields</h2>
          <p className="text-sm text-gray-600 mb-6">
            We auto-detected {getMappedFieldCount()} field mappings from your {parsedData.headers.length} columns.
            Adjust as needed.
          </p>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border-b font-medium text-sm text-gray-700">
              <div>CSV Column</div>
              <div>ToolTime Pro Field</div>
            </div>
            <div className="divide-y">
              {parsedData.headers.map((header) => {
                const sampleValue = parsedData.rows[0]?.[header] || '';
                return (
                  <div key={header} className="grid grid-cols-2 gap-4 p-4 items-center">
                    <div>
                      <div className="font-medium text-gray-900">{header}</div>
                      {sampleValue && (
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          e.g. &quot;{sampleValue}&quot;
                        </div>
                      )}
                    </div>
                    <select
                      value={fieldMapping[header] || 'skip'}
                      onChange={(e) =>
                        setFieldMapping({ ...fieldMapping, [header]: e.target.value })
                      }
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="skip">-- Skip this column --</option>
                      {TOOLTIME_CUSTOMER_FIELDS.map((f) => (
                        <option key={f.target} value={f.target}>
                          {f.label} {f.required ? '(required)' : ''}
                        </option>
                      ))}
                      <option value="_first_name">First Name (will combine with Last)</option>
                      <option value="_last_name">Last Name (will combine with First)</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep('upload')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep('preview')}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Preview Import <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Preview */}
      {step === 'preview' && parsedData && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Preview Import</h2>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{parsedData.rows.length}</div>
              <div className="text-sm text-gray-600">Total Rows</div>
            </div>
            <div className="bg-white border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{getValidRowCount()}</div>
              <div className="text-sm text-gray-600">Valid Rows</div>
            </div>
            <div className="bg-white border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {parsedData.rows.length - getValidRowCount()}
              </div>
              <div className="text-sm text-gray-600">Rows with Errors</div>
            </div>
          </div>

          {/* Options */}
          <div className="mb-6 p-4 bg-gray-50 border rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <span className="font-medium text-gray-900">Skip duplicates</span>
                <p className="text-sm text-gray-600">
                  Skip customers that already exist (matched by email or phone)
                </p>
              </div>
            </label>
          </div>

          {/* Preview table */}
          <div className="bg-white border rounded-xl overflow-hidden mb-6">
            <div className="p-3 bg-gray-50 border-b">
              <h3 className="font-medium text-sm text-gray-700">
                First {Math.min(10, parsedData.rows.length)} rows preview
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-3 py-2 text-left text-gray-600">#</th>
                    <th className="px-3 py-2 text-left text-gray-600">Name</th>
                    <th className="px-3 py-2 text-left text-gray-600">Email</th>
                    <th className="px-3 py-2 text-left text-gray-600">Phone</th>
                    <th className="px-3 py-2 text-left text-gray-600">Address</th>
                    <th className="px-3 py-2 text-left text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {getPreviewRows().map((row) => (
                    <tr key={row.index} className={row.errors.length > 0 ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2 text-gray-500">{row.index}</td>
                      <td className="px-3 py-2 font-medium">{row.transformed.name || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{row.transformed.email || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{row.transformed.phone || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {[row.transformed.address, row.transformed.city, row.transformed.state, row.transformed.zip]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </td>
                      <td className="px-3 py-2">
                        {row.errors.length === 0 ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Valid
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center gap-1" title={row.errors.join(', ')}>
                            <AlertTriangle className="w-4 h-4" /> {row.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep('map-fields')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Field Mapping
            </button>
            <button
              onClick={handleImport}
              disabled={getValidRowCount() === 0}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> Import {getValidRowCount()} Customers
            </button>
          </div>
        </div>
      )}

      {/* Importing... */}
      {step === 'importing' && (
        <div className="text-center py-16">
          <Loader2 className="w-16 h-16 text-blue-600 mx-auto animate-spin" />
          <h2 className="text-xl font-semibold mt-6 text-gray-900">Importing customers...</h2>
          <p className="text-gray-600 mt-2">
            Processing {parsedData?.rows.length || 0} rows. This may take a moment.
          </p>
        </div>
      )}

      {/* Step 5: Complete */}
      {step === 'complete' && importResult && (
        <div>
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold mt-4 text-gray-900">Import Complete!</h2>
          </div>

          {/* Results summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {importResult.summary.totalRows}
              </div>
              <div className="text-sm text-gray-600">Total Rows</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {importResult.summary.imported}
              </div>
              <div className="text-sm text-green-700">Imported</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {importResult.summary.skipped}
              </div>
              <div className="text-sm text-yellow-700">
                Skipped{importResult.summary.duplicates > 0 && ` (${importResult.summary.duplicates} duplicates)`}
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {importResult.summary.failed}
              </div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
          </div>

          {/* Error details */}
          {importResult.errors.length > 0 && (
            <div className="mb-6 border border-red-200 rounded-xl overflow-hidden">
              <div className="p-3 bg-red-50 border-b border-red-200">
                <h3 className="font-medium text-red-800">
                  Failed Rows ({importResult.errors.length})
                </h3>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="px-4 py-2 border-b border-red-100 text-sm">
                    <span className="font-medium text-red-700">Row {err.row}:</span>{' '}
                    <span className="text-red-600">{err.errors.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skipped details */}
          {importResult.skipped.length > 0 && (
            <div className="mb-6 border border-yellow-200 rounded-xl overflow-hidden">
              <div className="p-3 bg-yellow-50 border-b border-yellow-200">
                <h3 className="font-medium text-yellow-800">
                  Skipped Rows ({importResult.skipped.length})
                </h3>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {importResult.skipped.map((skip, i) => (
                  <div key={i} className="px-4 py-2 border-b border-yellow-100 text-sm">
                    <span className="font-medium text-yellow-700">{skip.name || 'Unknown'}:</span>{' '}
                    <span className="text-yellow-600">{skip.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <Link
              href="/dashboard/customers"
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700"
            >
              <Users className="w-4 h-4" /> View Customers
            </Link>
            <button
              onClick={() => {
                setStep('select-crm');
                setParsedData(null);
                setFieldMapping({});
                setImportResult(null);
                setError('');
                setSelectedCrm('');
              }}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-50"
            >
              <Upload className="w-4 h-4" /> Import More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
