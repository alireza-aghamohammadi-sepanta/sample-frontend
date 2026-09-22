import React, { useState } from 'react';
import client from '../api/client';
import { Todo } from '../types/todo';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  todo: Todo | null;
  onClose: () => void;
  onTaskDeleted?: (todoId: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  todo,
  onClose,
  onTaskDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  if (!isOpen || !todo) {
    return null;
  }

  const handleConfirm = async () => {
    if (!todo || isDeleting) return;

    try {
      setIsDeleting(true);
      setApiError(null);
      await client.delete(`/todos/${todo.id}`);
      if (onTaskDeleted) {
        onTaskDeleted(todo.id);
      }
      onClose();
    } catch (err: any) {
      setApiError(err?.message || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
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
          maxWidth: '450px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
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
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #eaeaea',
          }}
        >
          <h2
            id="delete-confirm-title"
            style={{ margin: 0, fontSize: '1.25rem', color: '#dc3545' }}
          >
            Delete Task
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              color: '#666',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
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

          <p style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: '#333', lineHeight: 1.5 }}>
            Are you sure you want to delete &ldquo;<strong>{todo.title}</strong>&rdquo;? This action cannot be undone.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1.5rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                borderRadius: '4px',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                color: '#333',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                backgroundColor: '#dc3545',
                color: '#fff',
                borderRadius: '4px',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                fontWeight: 500,
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
