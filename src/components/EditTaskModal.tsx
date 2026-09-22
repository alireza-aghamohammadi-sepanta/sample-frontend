import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { Todo, Asset } from '../types/todo';
import AttachmentUploader from './AttachmentUploader';
import AttachmentChip from './AttachmentChip';

export interface EditTaskModalProps {
  isOpen: boolean;
  todo: Todo | null;
  onClose: () => void;
  onTaskUpdated?: (updatedTodo: Todo) => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  todo,
  onClose,
  onTaskUpdated,
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
    if (isOpen && todo) {
      setTitle(todo.title || '');
      setDescription(todo.description || '');
      setAssets(todo.assets ? [...todo.assets] : []);
      setTouched({ title: false, description: false });
      setApiError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, todo]);

  if (!isOpen || !todo) {
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

  const handleRemoveAsset = (assetId: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  };

  const handleAssetUploaded = (asset: Asset) => {
    setAssets((prev) => [...prev, asset]);
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
      const updated = await client.patch<Todo>(`/todos/${todo.id}`, payload);
      if (onTaskUpdated) {
        onTaskUpdated(updated);
      }
      onClose();
    } catch (err: any) {
      setApiError(err?.message || 'Failed to update task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-task-title"
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
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #eaeaea',
          }}
        >
          <h2 id="edit-task-title" style={{ margin: 0, fontSize: '1.25rem' }}>
            Edit Task
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          {apiError && (
            <div
              role="alert"
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                borderRadius: '4px',
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}
            >
              {apiError}
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="edit-task-title-input"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                fontSize: '0.875rem',
                color: '#333',
              }}
            >
              Title *
            </label>
            <input
              id="edit-task-title-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTouched((prev) => ({ ...prev, title: true }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
              placeholder="Task title"
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: `1px solid ${titleError ? '#dc3545' : '#ccc'}`,
                borderRadius: '4px',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
              }}
            />
            {titleError && (
              <p
                style={{
                  color: '#dc3545',
                  fontSize: '0.8rem',
                  marginTop: '0.25rem',
                  marginBottom: 0,
                }}
              >
                {titleError}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="edit-task-desc-input"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                fontSize: '0.875rem',
                color: '#333',
              }}
            >
              Description
            </label>
            <textarea
              id="edit-task-desc-input"
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setTouched((prev) => ({ ...prev, description: true }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, description: true }))}
              placeholder="Task description (optional)"
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: `1px solid ${descError ? '#dc3545' : '#ccc'}`,
                borderRadius: '4px',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
            {descError && (
              <p
                style={{
                  color: '#dc3545',
                  fontSize: '0.8rem',
                  marginTop: '0.25rem',
                  marginBottom: 0,
                }}
              >
                {descError}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                fontSize: '0.875rem',
                color: '#333',
              }}
            >
              Attached Assets ({assets.length})
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
                  flexDirection: 'column',
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
              disabled={isSubmitting}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                color: '#333',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                backgroundColor: isFormValid && !isSubmitting ? '#007bff' : '#6c757d',
                color: '#fff',
                borderRadius: '4px',
                cursor: isFormValid && !isSubmitting ? 'pointer' : 'not-allowed',
                fontWeight: 500,
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;
