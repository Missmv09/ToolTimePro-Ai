'use client';

import { useState, useEffect } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Calendar,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Photo {
  id: string;
  photo_url: string;
  photo_type: string;
  caption: string | null;
  created_at: string;
}

interface JobWithPhotos {
  id: string;
  title: string;
  scheduled_date: string;
  status: string;
  photos: Photo[];
}

export default function PortalPhotos() {
  const [jobs, setJobs] = useState<JobWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const t = useTranslations('portal.photos');

  const PHOTO_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    before: { label: t('before'), color: 'bg-gray-100 text-gray-600' },
    during: { label: t('during'), color: 'bg-blue-100 text-blue-600' },
    after: { label: t('after'), color: 'bg-green-100 text-green-600' },
  };

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    if (!token) return;

    fetch('/api/portal?action=photos', { headers: { 'x-portal-token': token } })
      .then(res => res.json())
      .then(data => {
        const jobList = data.jobs || [];
        setJobs(jobList);
        if (jobList.length > 0) setExpandedJob(jobList[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxPhoto) setLightboxPhoto(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxPhoto]);

  if (loading) return <div className="text-center py-12 text-gray-400">{t('loading')}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <Camera className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="font-medium text-gray-700">{t('noPhotos')}</h3>
          <p className="text-sm text-gray-500 mt-1">{t('noPhotosDescription')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => {
            const isExpanded = expandedJob === job.id;
            const beforePhotos = job.photos.filter(p => p.photo_type === 'before');
            const duringPhotos = job.photos.filter(p => p.photo_type === 'during');
            const afterPhotos = job.photos.filter(p => p.photo_type === 'after');

            return (
              <div key={job.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {new Date(job.scheduled_date).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-400">{job.photos.length} {t('photos')}</span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4">
                    {[
                      { label: t('before'), photos: beforePhotos, type: 'before' },
                      { label: t('during'), photos: duringPhotos, type: 'during' },
                      { label: t('after'), photos: afterPhotos, type: 'after' },
                    ].filter(g => g.photos.length > 0).map(group => (
                      <div key={group.type}>
                        <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${PHOTO_TYPE_LABELS[group.type]?.color || 'bg-gray-100'}`}>
                            {group.label}
                          </span>
                          <span className="text-xs text-gray-400">{group.photos.length} {t('photos')}</span>
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          {group.photos.map(photo => (
                            <button
                              key={photo.id}
                              onClick={() => setLightboxPhoto(photo)}
                              className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
                            >
                              <img
                                src={photo.photo_url}
                                alt={photo.caption || `${group.label} photo`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxPhoto(null)}>
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-3xl max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <img
              src={lightboxPhoto.photo_url}
              alt={lightboxPhoto.caption || 'Job photo'}
              className="max-w-full max-h-[80vh] rounded-lg object-contain"
            />
            {lightboxPhoto.caption && (
              <p className="text-white/80 text-center mt-3 text-sm">{lightboxPhoto.caption}</p>
            )}
            <p className="text-white/50 text-center mt-1 text-xs">
              {PHOTO_TYPE_LABELS[lightboxPhoto.photo_type]?.label || t('photo')} —{' '}
              {new Date(lightboxPhoto.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
