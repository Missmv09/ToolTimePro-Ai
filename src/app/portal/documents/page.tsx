'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Shield,
  Receipt,
  FileCheck,
  Camera,
  File,
  Calendar,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Document {
  id: string;
  job_id: string | null;
  title: string;
  description: string | null;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PortalDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const t = useTranslations('portal.documents');

  const DOC_TYPE_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
    contract: { label: t('typeContract'), icon: FileCheck, color: 'text-blue-600 bg-blue-50' },
    warranty: { label: t('typeWarranty'), icon: Shield, color: 'text-green-600 bg-green-50' },
    permit: { label: t('typePermit'), icon: FileText, color: 'text-purple-600 bg-purple-50' },
    receipt: { label: t('typeReceipt'), icon: Receipt, color: 'text-orange-600 bg-orange-50' },
    photo: { label: t('typePhoto'), icon: Camera, color: 'text-pink-600 bg-pink-50' },
    other: { label: t('typeDocument'), icon: File, color: 'text-gray-600 bg-gray-50' },
  };

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    if (!token) return;

    fetch('/api/portal?action=documents', { headers: { 'x-portal-token': token } })
      .then(res => res.json())
      .then(data => { setDocuments(data.documents || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">{t('loading')}</div>;

  const docTypes = [...new Set(documents.map(d => d.document_type))];
  const filtered = filter === 'all' ? documents : documents.filter(d => d.document_type === filter);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>

      {documents.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="font-medium text-gray-700">{t('noDocuments')}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {t('noDocumentsDescription')}
          </p>
        </div>
      ) : (
        <>
          {/* Filter tabs */}
          {docTypes.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all' ? 'bg-navy-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t('filterAll')} ({documents.length})
              </button>
              {docTypes.map(type => {
                const config = DOC_TYPE_CONFIG[type] || DOC_TYPE_CONFIG.other;
                const count = documents.filter(d => d.document_type === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filter === type ? 'bg-navy-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {config.label} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Document list */}
          <div className="space-y-3">
            {filtered.map(doc => {
              const config = DOC_TYPE_CONFIG[doc.document_type] || DOC_TYPE_CONFIG.other;
              const DocIcon = config.icon;

              return (
                <div key={doc.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      <DocIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">{doc.title}</h3>
                      {doc.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                        {doc.file_size && (
                          <span className="text-xs text-gray-400">{formatFileSize(doc.file_size)}</span>
                        )}
                      </div>
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Download className="w-5 h-5 text-gray-600" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
