import React, { useState, useMemo } from 'react';
import { TodoList } from '../types/todo';
import CreateListModal from './CreateListModal';
import EditListModal from './EditListModal';

export interface ListSidebarProps {
  lists: TodoList[];
  activeListId: string | null;
  onSelectList: (listId: string) => void;
  onListCreated?: (list: TodoList) => void;
  onListUpdated?: (list: TodoList) => void;
  onDeleteList?: (listId: string) => void | Promise<void>;
}

export const ListSidebar: React.FC<ListSidebarProps> = ({
  lists,
  activeListId,
  onSelectList,
  onListCreated,
  onListUpdated,
  onDeleteList,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<TodoList | null>(null);

  // Default list pinned at top; custom lists sorted alphabetically (case-insensitive)
  const orderedLists = useMemo(() => {
    const defaultItem = lists.find((l) => l.is_default);
    const customItems = lists
      .filter((l) => !l.is_default && typeof l?.name === 'string')
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

    return defaultItem ? [defaultItem, ...customItems] : customItems;
  }, [lists]);

  const handleCreateSuccess = (newList: TodoList) => {
    if (onListCreated) {
      onListCreated(newList);
    }
  };

  const handleUpdateSuccess = (updatedList: TodoList) => {
    if (onListUpdated) {
      onListUpdated(updatedList);
    }
  };

  return (
    <aside
      aria-label="Lists Navigation"
      style={{
        width: '240px',
        minWidth: '240px',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2
          style={{
            fontSize: '14px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#64748B',
            margin: 0,
          }}
        >
          Lists
        </h2>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            height: '28px',
            padding: '4px 10px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          + New List
        </button>
      </div>

      <nav aria-label="Todo lists" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {orderedLists.map((list) => {
          const isActive = list.id === activeListId;
          return (
            <div
              key={list.id}
              data-testid={`list-item-${list.id}`}
              data-active={isActive ? 'true' : 'false'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
                transition: 'background-color 0.15s ease',
              }}
            >
              <button
                type="button"
                onClick={() => onSelectList(list.id)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563EB' : '#0F172A',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {list.name}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setEditingList(list)}
                  aria-label={`Rename ${list.name}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '2px 4px',
                    borderRadius: '4px',
                  }}
                >
                  Rename
                </button>
                {!list.is_default && onDeleteList && (
                  <button
                    type="button"
                    onClick={() => onDeleteList(list.id)}
                    aria-label={`Delete ${list.name}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#DC2626',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </nav>

      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onListCreated={handleCreateSuccess}
      />

      <EditListModal
        isOpen={editingList !== null}
        todoList={editingList}
        onClose={() => setEditingList(null)}
        onListUpdated={handleUpdateSuccess}
      />
    </aside>
  );
};

export default ListSidebar;
