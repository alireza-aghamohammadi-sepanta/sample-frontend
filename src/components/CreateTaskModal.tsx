import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Todo, Asset } from '../types/todo';
import AttachmentUploader from './AttachmentUploader';
import AttachmentChip from './AttachmentChip';

export interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: (task: Todo) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [touched, setTouched] = useState<{ title: boolean; description: boolean }>({
    title: false,
    description: false,
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setAssets([]);
      setTouched({ title: false, description: false });
      setApiError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  // Validation rules:
  // Title: 1 to 255 characters
  // Description: up to 1024 characters
  const trimmedTitle = title.trim();
  const isTitleEmpty = trimmedTitle.length === 0;
  const isTitleTooLong = title.length > 255;
  const isDescTooLong = description.length > 1024;

  let titleError: string | null = null;
  if (isTitleTooLong) {
    titleError = 'Title must be 255 characters or less';
  } else if (touched.title && isTitleEmpty) {
    titleError = 'Title is required';
  }

  let descError: string | null = null;
  if (isDescTooLong) {
    descError = 'Description must be 1024 characters or less';
  }

  const isFormValid = !isTitleEmpty && !isTitleTooLong && !isDescTooLong;

  const handleAssetUploaded = (asset: Asset) => {
    setAssets((prev) => [...prev, asset]);
  };

  const handleRemoveAsset = (assetId: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ title: true, description: true });

    if (!isFormValid || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setApiError(null);
      const payload = {
        title: trimmedTitle,
        description: description.trim() || null,
        asset_ids: assets.map((a) => a.id),
      };
      const created = await client.post<Todo>('/todos', payload);
      if (onTaskCreated) {
        onTaskCreated(created);
      }
      onClose();
    } catch (err: any) {
      setApiError(err?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '500px',
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2 id="create-task-title" style={{ margin: 0, fontSize: '1.25rem' }}>
            Create Task
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            &times;
          </button>
        </div>

        {apiError && (
          <div
            role="alert"
            style={{
              padding: '0.75rem',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.9rem',
            }}
          >
            {apiError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="task-title"
              style={{
                display: 'block',
                marginBottom: '0.25rem',
                fontWeight: 500,
                fontSize: '0.9rem',
              }}
            >
              Title *
            </label>
            <input
              id="task-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTouched((prev) => ({ ...prev, title: true }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
              placeholder="Enter task title"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: `1px solid ${titleError ? '#dc3545' : '#ccc'}`,
                boxSizing: 'border-box',
                fontSize: '1rem',
              }}
            />
            {titleError && (
              <div
                role="alert"
                style={{
                  color: '#dc3545',
                  fontSize: '0.85rem',
                  marginTop: '0.25rem',
                }}
              >
                {titleError}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="task-description"
              style={{
                display: 'block',
                marginBottom: '0.25rem',
                fontWeight: 500,
                fontSize: '0.9rem',
              }}
            >
              Description
            </label>
            <textarea
              id="task-description"
              name="description"
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setTouched((prev) => ({ ...prev, description: true }));
              }}
              placeholder="Enter task description (optional)"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: `1px solid ${descError ? '#dc3545' : '#ccc'}`,
                boxSizing: 'border-box',
                fontSize: '1rem',
                fontFamily: 'inherit',
              }}
            />
            {descError && (
              <div
                role="alert"
                style={{
                  color: '#dc3545',
                  fontSize: '0.85rem',
                  marginTop: '0.25rem',
                }}
              >
                {descError}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                fontSize: '0.9rem',
              }}
            >
              Attachments {assets.length > 0 && `(${assets.length}/10)`}
            </label>
            <AttachmentUploader
              currentAssets={assets}
              onAssetUploaded={handleAssetUploaded}
              disabled={isSubmitting}
            />
            {assets.length > 0 && (
              <div
                data-testid="attached-assets"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                }}
              >
                {assets.map((asset) => (
                  <AttachmentChip
                    key={asset.id}
                    asset={asset}
                    onRemove={handleRemoveAsset}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: !isFormValid || isSubmitting ? '#a0c4f1' : '#007bff',
                color: '#fff',
                cursor: !isFormValid || isSubmitting ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
