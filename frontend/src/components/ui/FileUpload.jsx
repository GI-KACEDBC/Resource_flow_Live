import React, { useRef, useState } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle } from 'lucide-react';

export const FileUpload = ({
  label,
  name,
  accept = 'image/*,.pdf',
  required = false,
  value,
  onChange,
  error,
  maxSizeMB = 5,
  description,
}) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState('');

  const handleFile = (file) => {
    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    if (file.size > maxSize) {
      setFileError(`File size must be less than ${maxSizeMB}MB`);
      onChange(null);
      return;
    }

    // Validate file type
    const validTypes = accept.split(',').map((type) => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType =
      validTypes.some((type) => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase();
        }
        if (type.includes('/*')) {
          const baseType = type.split('/')[0];
          return file.type.startsWith(baseType);
        }
        return file.type === type;
      }) || file.type === 'application/pdf';

    if (!isValidType) {
      setFileError('Invalid file type. Please upload an image or PDF.');
      onChange(null);
      return;
    }

    setFileError('');
    onChange(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    onChange(null);
    setFileError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-600">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && <p className="text-xs text-slate-500">{description}</p>}

      {!value ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50'
              : error || fileError
              ? 'border-red-300 bg-red-50'
              : 'border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            name={name}
            accept={accept}
            onChange={handleChange}
            className="hidden"
            // Don't use HTML5 required on hidden inputs - handle validation in form submit
            // required={required}
          />
          <Upload
            className={`mx-auto mb-2 ${
              dragActive ? 'text-emerald-600' : 'text-slate-400'
            }`}
            size={32}
          />
          <p className="text-sm text-slate-600 mb-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-emerald-600 hover:text-emerald-700 font-semibold underline"
            >
              Click to upload
            </button>{' '}
            or drag and drop
          </p>
          <p className="text-xs text-slate-500">
            {accept.includes('image') ? 'PNG, JPG, GIF' : ''} PDF up to {maxSizeMB}MB
          </p>
        </div>
      ) : (
        <div className="border-2 border-emerald-200 bg-emerald-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-white rounded border border-emerald-200">
                <File className="text-emerald-600" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{value.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(value.size)}</p>
              </div>
              <CheckCircle className="text-emerald-600 shrink-0" size={20} />
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="ml-3 p-1 text-red-600 hover:bg-red-100 rounded transition"
              title="Remove file"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {(error || fileError) && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle size={14} />
          <span>{error || fileError}</span>
        </div>
      )}
    </div>
  );
};
