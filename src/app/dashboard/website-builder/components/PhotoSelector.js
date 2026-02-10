'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, Upload, X, ImageIcon } from 'lucide-react';

export default function PhotoSelector({ photos, selectedPhoto, onSelect, multiple = false, selectedPhotos = [], onSelectMultiple, label }) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Max 5MB per file.`);
        continue;
      }

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert(`${file.name} is not a supported format. Use JPG, PNG, or WebP.`);
        continue;
      }

      // Create local preview URL
      const url = URL.createObjectURL(file);
      const photoData = { type: 'upload', url, file, alt: file.name };

      if (multiple && onSelectMultiple) {
        onSelectMultiple([...selectedPhotos, photoData]);
      } else if (onSelect) {
        onSelect(photoData);
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  const isPhotoSelected = (photo) => {
    if (multiple) {
      return selectedPhotos.some((p) => p.id === photo.id || p.url === photo.url);
    }
    return selectedPhoto?.id === photo.id || selectedPhoto?.url === photo.url;
  };

  const handlePhotoClick = (photo) => {
    const photoData = { type: 'stock', url: photo.url, id: photo.id, alt: photo.alt };

    if (multiple && onSelectMultiple) {
      if (isPhotoSelected(photo)) {
        onSelectMultiple(selectedPhotos.filter((p) => p.id !== photo.id && p.url !== photo.url));
      } else {
        onSelectMultiple([...selectedPhotos, photoData]);
      }
    } else if (onSelect) {
      onSelect(photoData);
    }
  };

  const removePhoto = (index) => {
    if (multiple && onSelectMultiple) {
      const updated = [...selectedPhotos];
      // Revoke object URL if it's an upload
      if (updated[index]?.type === 'upload' && updated[index]?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(updated[index].url);
      }
      updated.splice(index, 1);
      onSelectMultiple(updated);
    }
  };

  return (
    <div>
      {label && <p className="text-sm font-medium text-navy-500 mb-3">{label}</p>}

      {/* Selected photos (multiple mode) */}
      {multiple && selectedPhotos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedPhotos.map((photo, index) => (
            <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gold-500">
              <Image src={photo.url} alt={photo.alt || ''} className="w-full h-full object-cover" fill />
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stock photo grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((photo) => {
          const selected = isPhotoSelected(photo);

          return (
            <button
              key={photo.id}
              onClick={() => handlePhotoClick(photo)}
              className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                selected ? 'border-gold-500 shadow-card' : 'border-gray-200 hover:border-gold-300'
              }`}
            >
              <Image
                src={photo.url}
                alt={photo.alt}
                className="w-full h-full object-cover"
                fill
              />
              {selected && (
                <div className="absolute inset-0 bg-gold-500/20 flex items-center justify-center">
                  <div className="w-7 h-7 bg-gold-500 rounded-full flex items-center justify-center">
                    <Check size={14} className="text-navy-500" />
                  </div>
                </div>
              )}
            </button>
          );
        })}

        {/* Upload button */}
        <label className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-gold-400 cursor-pointer transition-colors flex flex-col items-center justify-center gap-1 bg-gray-50 hover:bg-gold-50">
          {uploading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold-500" />
          ) : (
            <>
              <Upload size={18} className="text-gray-400" />
              <span className="text-xs text-gray-400">Upload</span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple={multiple}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
