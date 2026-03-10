import * as React from 'react';

interface BaseButtonProps {
  onClick: (e: React.MouseEvent) => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onMouseDown?: (e: React.MouseEvent) => void;
}

export const BaseActionButton: React.FC<BaseButtonProps> = ({
  onClick,
  title,
  children,
  className = '',
  style,
  onMouseDown,
}) => (
  <button
    className={`shared-item-action-btn ${className}`}
    onClick={e => {
      e.stopPropagation();
      onClick(e);
    }}
    onMouseDown={onMouseDown}
    title={title}
    style={style}
  >
    {children}
  </button>
);

interface PinButtonProps {
  isPinned: boolean;
  onToggle: () => void;
  title?: string;
}

export const PinButton: React.FC<PinButtonProps> = ({ isPinned, onToggle, title }) => (
  <BaseActionButton onClick={onToggle} title={title} className={isPinned ? 'pinned' : ''}>
    {isPinned ? '📌' : '📍'}
  </BaseActionButton>
);

export const DeleteButton: React.FC<{ onClick: () => void; title?: string }> = ({
  onClick,
  title,
}) => (
  <BaseActionButton onClick={onClick} title={title} className="delete-btn">
    🗑️
  </BaseActionButton>
);

export const ConfirmButton: React.FC<{
  onClick: () => void;
  title?: string;
  className?: string;
  isSuccess?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
}> = ({ onClick, title, className = '', isSuccess, onMouseDown }) => (
  <BaseActionButton
    onClick={onClick}
    onMouseDown={onMouseDown}
    title={title}
    className={`${isSuccess ? 'confirm-success' : 'confirm-delete'} ${className}`}
  >
    ✓
  </BaseActionButton>
);

export const CancelButton: React.FC<{ onClick: () => void; title?: string }> = ({
  onClick,
  title,
}) => (
  <BaseActionButton onClick={onClick} title={title} className="cancel-btn">
    ✗
  </BaseActionButton>
);

export const AbandonButton: React.FC<{ onClick: () => void; title?: string }> = ({
  onClick,
  title,
}) => (
  <BaseActionButton onClick={onClick} title={title} className="abandon-btn">
    ❌
  </BaseActionButton>
);
