import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { TodoList } from '../types/todo';

export interface EditListModalProps {
  isOpen: boolean;
  todoList: TodoList | null;
  onClose: () => void;
  onListUpdated?: (list: TodoList) => void;
}

export const EditListModal: React.FC<EditListModalProps> = ({
  isOpen,
  todoList,
  onClose,
  onListUpdated,
}) => {
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && todoList) {
      setName(todoList.name);
      setTouched(false);
      setApiError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, todoList]);

  if (!isOpen || !todoList) {
    return null;
  }

  const trimmedName = name.trim();
  const isEmpty = trimmedName.length === 0;
  const isTooLong = name.length > 255;

  let validationError: string | null = null;
  if (isTooLong) {
    validationError = 'Name must be 255 characters or less';
  } else if (touched && isEmpty) {
    validationError = 'Name is required';
  }

  const isFormValid = !isEmpty && !isTooLong;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!isFormValid || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setApiError(null);
      const updated = await client.patch<TodoList>(`/lists/${todoList.id}`, {
        name: trimmedName,
      });
      if (onListUpdated) {
        onListUpdated(updated);
      }
      onClose();
    } catch (err: any) {
      setApiError(err?.message || 'Failed to update list');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-list-title"
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
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '440px',
          padding: '24px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <h2
          id="edit-list-title"
          style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: '#0F172A',
            lineHeight: 1.35,
          }}
        >
          Rename List
        </h2>

        {apiError && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FEE2E2',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="edit-list-name-input"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0F172A',
              }}
            >
              List Name
            </label>
            <input
              id="edit-list-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: '36px',
                padding: '8px 12px',
                border: validationError ? '1px solid #DC2626' : '1px solid #E2E8F0',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#0F172A',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            />
            {validationError && (
              <p style={{ margin: '4px 0 0 0', color: '#DC2626', fontSize: '12px' }}>
                {validationError}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                height: '36px',
                padding: '8px 16px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              style={{
                height: '36px',
                padding: '8px 16px',
                backgroundColor: !isFormValid || isSubmitting ? '#93C5FD' : '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: !isFormValid || isSubmitting ? 'not-allowed' : 'pointer',
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

export default EditListModal;
