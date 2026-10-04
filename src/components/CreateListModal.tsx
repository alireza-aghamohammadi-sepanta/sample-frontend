import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { TodoList } from '../types/todo';

export interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListCreated?: (list: TodoList) => void;
}

export const CreateListModal: React.FC<CreateListModalProps> = ({
  isOpen,
  onClose,
  onListCreated,
}) => {
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTouched(false);
      setApiError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
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
      const created = await client.post<TodoList>('/lists', { name: trimmedName });
      if (onListCreated) {
        onListCreated(created);
      }
      onClose();
    } catch (err: any) {
      setApiError(err?.message || 'Failed to create list');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-list-title"
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
          id="create-list-title"
          style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: '#0F172A',
            lineHeight: 1.35,
          }}
        >
          Create New List
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
              htmlFor="create-list-name-input"
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
              id="create-list-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g., Work, Personal, Groceries"
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
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateListModal;
