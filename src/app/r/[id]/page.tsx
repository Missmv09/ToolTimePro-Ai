'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, ExternalLink, Loader2 } from 'lucide-react';

export default function ReviewRedirect() {
  const params = useParams();
  const trackingId = params.id as string;
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error' | 'no_link'>('loading');
  const [companyName, setCompanyName] = useState('');
  const [reviewUrl, setReviewUrl] = useState('');

  useEffect(() => {
    if (!trackingId) {
      setStatus('error');
      return;
    }

    // Track the click and get the review link
    fetch(`/api/reviews/track?token=${trackingId}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setCompanyName(data.companyName || '');

        if (data.reviewUrl) {
          setReviewUrl(data.reviewUrl);
          setStatus('redirecting');
          // Short delay so user sees the page, then redirect
          setTimeout(() => {
            window.location.href = data.reviewUrl;
          }, 1500);
        } else {
          setStatus('no_link');
        }
      })
      .catch(() => {
        setStatus('error');
      });
  }, [trackingId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-[#f5a623] mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">Loading...</p>
          </>
        )}

        {status === 'redirecting' && (
          <>
            <div className="w-16 h-16 bg-[#fef3d6] rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="w-8 h-8 text-[#f5a623]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
            <p className="text-gray-500 mb-6">
              Taking you to leave a review for <strong>{companyName}</strong>...
            </p>
            <Loader2 className="w-6 h-6 text-[#f5a623] mx-auto animate-spin" />
            <p className="text-sm text-gray-400 mt-4">
              Not redirected?{' '}
              <a href={reviewUrl} className="text-[#f5a623] hover:text-[#e6991a] font-medium">
                Click here
              </a>
            </p>
          </>
        )}

        {status === 'no_link' && (
          <>
            <div className="w-16 h-16 bg-[#fef3d6] rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="w-8 h-8 text-[#f5a623]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Thanks for Your Feedback!
            </h1>
            <p className="text-gray-500 mb-6">
              {companyName ? `${companyName} appreciates` : 'We appreciate'} your business.
              If you have a moment, please search for us on Google and leave a review!
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="text-gray-500">This review link is no longer active.</p>
          </>
        )}
      </div>
    </div>
  );
}
