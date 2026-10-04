import React, { useState } from 'react';
import client from '../api/client';
import { TodoList } from '../types/todo';

export interface DeleteListModalProps {
  isOpen: boolean;
  list?: TodoList | null;
  todoList?: TodoList | null;
  onClose: () => void;
  onListDeleted?: (listId: string) => void;
}

export const DeleteListModal: React.FC<DeleteListModalProps> = ({
  isOpen,
  list,
  todoList,
  onClose,
  onListDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const targetList = list || todoList || null;

  if (!isOpen || !targetList) {
    return null;
  }

  const handleConfirm = async () => {
    if (!targetList || isDeleting) return;

    try {
      setIsDeleting(true);
      setApiError(null);
      await client.delete(`/lists/${targetList.id}`);
      if (onListDeleted) {
        onListDeleted(targetList.id);
      }
      onClose();
    } catch (err: any) {
      setApiError(err?.message || 'Failed to delete list');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-list-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '450px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <h2
            id="delete-list-title"
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#0F172A',
            }}
          >
            Delete List
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              color: '#64748B',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {apiError && (
            <div
              role="alert"
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FEE2E2',
                borderRadius: '6px',
                marginBottom: '1rem',
                fontSize: '14px',
              }}
            >
              {apiError}
            </div>
          )}

          <p
            style={{
              margin: '0 0 1rem 0',
              fontSize: '14px',
              color: '#0F172A',
              lineHeight: 1.5,
            }}
          >
            Are you sure you want to delete &ldquo;<strong>{targetList.name}</strong>&rdquo;?
          </p>

          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              marginBottom: '1.5rem',
              fontSize: '13px',
              color: '#64748B',
              lineHeight: 1.5,
            }}
          >
            All tasks and media attachments will be safely preserved and atomically reassigned to your default list without data loss.
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
              disabled={isDeleting}
              style={{
                height: '36px',
                padding: '8px 16px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              style={{
                height: '36px',
                padding: '8px 16px',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontSize: '14px',
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete List'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteListModal;
