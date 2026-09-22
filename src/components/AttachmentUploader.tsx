import React, { useState, useRef } from 'react';
import { Asset } from '../types/todo';
import {
  uploadFileDirectly,
  validateFile,
  MAX_ATTACHMENTS,
} from '../services/storage';

export interface AttachmentUploaderProps {
  currentAssets?: Asset[];
  assets?: Asset[];
  onAssetUploaded: (asset: Asset) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  currentAssets,
  assets,
  onAssetUploaded,
  maxFiles = MAX_ATTACHMENTS,
  disabled = false,
}) => {
  const fileList = currentAssets ?? assets ?? [];
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isCapReached = fileList.length >= maxFiles;

  const handleFiles = async (files: FileList | File[]) => {
    setErrorMessage(null);
    const filesArray = Array.from(files);
    if (filesArray.length === 0) return;

    // Check capacity limit
    if (fileList.length >= maxFiles) {
      setErrorMessage(`Cannot add more than ${maxFiles} attachments. Limit of 10 attachments reached.`);
      return;
    }

    if (fileList.length + filesArray.length > maxFiles) {
      setErrorMessage(
        `Cannot add more than ${maxFiles} attachments. Selecting ${filesArray.length} files would exceed the limit of 10 attachments.`
      );
      return;
    }

    // Validate MIME types and file sizes before uploading
    for (const file of filesArray) {
      const err = validateFile(file, fileList.length, maxFiles);
      if (err) {
        setErrorMessage(err);
        return;
      }
    }

    // Process uploads sequentially or concurrently
    setIsUploading(true);
    try {
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        setCurrentFileName(file.name);
        setUploadProgress(0);

        const asset = await uploadFileDirectly(file, (percent) => {
          setUploadProgress(percent);
        });

        onAssetUploaded(asset);
      }
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload file to storage');
    } finally {
      setIsUploading(false);
      setCurrentFileName(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isCapReached && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    if (e.dataTransfer && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div style={{ marginBottom: '1rem', width: '100%' }}>
      <div
        data-testid="attachment-dropzone"
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!isUploading && !disabled && !isCapReached && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
        style={{
          border: `2px dashed ${
            isDragging ? '#1a73e8' : isCapReached ? '#e2e8f0' : '#cbd5e1'
          }`,
          borderRadius: '8px',
          padding: '1.25rem 1rem',
          textAlign: 'center',
          backgroundColor: isDragging
            ? '#f0f7ff'
            : isCapReached
            ? '#f8fafc'
            : '#f8fafc',
          cursor: isCapReached || disabled || isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          data-testid="attachment-file-input"
          onChange={onInputChange}
          disabled={disabled || isUploading}
          style={{ display: 'none' }}
        />

        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
          {isCapReached ? (
            <span style={{ color: '#94a3b8' }}>
              Maximum limit of {maxFiles} attachments reached
            </span>
          ) : isUploading ? (
            <span>Uploading {currentFileName || 'file'}...</span>
          ) : (
            <div>
              <span style={{ fontWeight: 600, color: '#2563eb' }}>
                Click to upload
              </span>{' '}
              or drag & drop media files
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  marginTop: '0.25rem',
                }}
              >
                Images and videos only (up to 500 MB each, max {maxFiles} files)
              </div>
            </div>
          )}
        </div>

        {isUploading && (
          <div
            data-testid="upload-progress"
            style={{ marginTop: '0.75rem', width: '100%' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#475569',
                marginBottom: '0.25rem',
              }}
            >
              <span>{currentFileName}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#e2e8f0',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  backgroundColor: '#2563eb',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <p
          data-testid="attachment-error"
          role="alert"
          style={{
            color: '#dc2626',
            fontSize: '0.8rem',
            marginTop: '0.35rem',
            marginBottom: 0,
          }}
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default AttachmentUploader;
