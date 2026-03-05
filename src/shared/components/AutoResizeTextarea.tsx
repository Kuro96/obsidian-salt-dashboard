import * as React from 'react';
import { useEffect, useRef } from 'react';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onEnter?: () => void; // Triggered on Enter (without Shift)
  preventParentScroll?: boolean;
}

export const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  value,
  onChange,
  onEnter,
  onKeyDown,
  style,
  autoFocus,
  preventParentScroll = true,
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSelecting = useRef(false);
  const scrollParentRef = useRef<{ el: HTMLElement; originalOverflow: string } | null>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  };

  const lockScroll = () => {
    if (!preventParentScroll) return;
    const el = textareaRef.current;
    if (!el) return;

    // Find closest scrollable parent
    let parent = el.parentElement;
    while (parent) {
      const computedStyle = window.getComputedStyle(parent);
      if (['auto', 'scroll'].includes(computedStyle.overflowY)) {
        // Save inline style and lock
        scrollParentRef.current = {
          el: parent,
          originalOverflow: parent.style.overflowY,
        };
        parent.style.overflowY = 'hidden';
        return;
      }
      parent = parent.parentElement;
    }
  };

  const unlockScroll = () => {
    if (scrollParentRef.current) {
      scrollParentRef.current.el.style.overflowY = scrollParentRef.current.originalOverflow;
      scrollParentRef.current = null;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  useEffect(() => {
    if (autoFocus) {
      // Small timeout to ensure layout is ready
      setTimeout(() => {
        textareaRef.current?.focus();
        adjustHeight();
      }, 0);
    }
  }, [autoFocus]);

  // Handle blocking scroll during text selection
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // If user is selecting text (mouse down), prevent scroll
      if (isSelecting.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Passive: false is required to be able to preventDefault on wheel events
    el.addEventListener('wheel', handleWheel, { passive: false });

    const handleGlobalMouseUp = () => {
      isSelecting.current = false;
      unlockScroll();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      unlockScroll(); // Ensure unlock on unmount
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnter?.();
    }
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const { onMouseDown, ...restProps } = props;

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      value={value}
      onChange={e => {
        onChange(e);
      }}
      onKeyDown={handleKeyDown}
      onMouseDown={e => {
        isSelecting.current = true;
        lockScroll();
        onMouseDown?.(e);
      }}
      style={{
        resize: 'none',
        overflow: 'hidden',
        minHeight: '28px',
        fontFamily: 'inherit',
        lineHeight: '1.5',
        ...style,
      }}
      autoFocus={autoFocus}
      {...restProps}
    />
  );
};
