import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { Task } from '../../../../app/types';
import { MarkdownContent } from '../../../../shared/components/MarkdownContent';
import { AutoResizeTextarea } from '../../../../shared/components/AutoResizeTextarea';

interface TodoItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  onPin: (task: Task) => void;
  onAbandon: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onUpdate?: (task: Task, newText: string) => void;
}

export const TodoItem: React.FC<TodoItemProps> = ({
  task,
  onToggle,
  onPin,
  onAbandon,
  onDelete,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editText, setEditText] = useState(task.text);

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' || target.closest('a')) {
      return;
    }

    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      return;
    }

    if (task.completed || task.isAbandoned) return;

    setIsEditing(true);
    setEditText(task.text);
  };

  const handleSubmit = () => {
    if (editText.trim() !== task.text) {
      onUpdate?.(task, editText.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(task.text);
    }
  };

  return (
    <div
      className={`todoItem ${task.completed ? 'completed' : task.isAbandoned ? 'abandoned' : ''}`}
    >
      <input
        type="checkbox"
        className="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task)}
        disabled={isEditing || task.isAbandoned}
      />

      <div className="content" onClick={handleContentClick}>
        {isEditing ? (
          <AutoResizeTextarea
            className="edit-input"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            onEnter={handleSubmit}
            onBlur={handleSubmit}
            onClick={e => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <MarkdownContent
            content={task.text}
            sourcePath={task.sourcePath}
            style={{ display: 'inline' }}
          />
        )}
      </div>

      <div className="actions">
        {isEditing ? (
          <button
            className="actionBtn confirm-btn"
            onMouseDown={e => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            ✓
          </button>
        ) : isDeleting ? (
          <>
            <button
              className="actionBtn confirm-delete-btn"
              onClick={e => {
                e.stopPropagation();
                onDelete?.(task);
                setIsDeleting(false);
              }}
              title={t('modules.todo.shared.item.confirmDelete')}
              style={{ color: 'var(--interactive-error)', fontWeight: 'bold' }}
            >
              ✓
            </button>
            <button
              className="actionBtn cancel-delete-btn"
              onClick={e => {
                e.stopPropagation();
                setIsDeleting(false);
              }}
              title={t('modules.todo.shared.item.cancel')}
            >
              ✗
            </button>
          </>
        ) : (
          <>
            <button
              className={`actionBtn ${task.isPinned ? 'pinned' : ''}`}
              onClick={e => {
                e.stopPropagation();
                onPin(task);
              }}
              title={t('modules.todo.shared.item.pin')}
            >
              {task.isPinned ? '📌' : '📍'}
            </button>

            {/* Daily tasks do not support abandoning */}
            {!task.isDaily && (
              <button
                className="actionBtn"
                onClick={e => {
                  e.stopPropagation();
                  onAbandon(task);
                }}
                title={t('modules.todo.shared.item.abandon')}
              >
                ❌
              </button>
            )}

            {/* Delete button (Trash) */}
            {onDelete && (
              <button
                className="actionBtn delete-btn"
                onClick={e => {
                  e.stopPropagation();
                  setIsDeleting(true);
                }}
                title={t('modules.todo.shared.item.delete')}
              >
                🗑️
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
