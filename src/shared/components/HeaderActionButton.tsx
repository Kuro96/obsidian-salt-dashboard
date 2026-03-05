import * as React from 'react';

interface HeaderActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  title?: string;
}

export const HeaderActionButton = React.forwardRef<HTMLButtonElement, HeaderActionButtonProps>(
  ({ icon, title, className, children, ...props }, ref) => {
    return (
      <button ref={ref} className={`header-action-btn ${className || ''}`} title={title} {...props}>
        {icon}
        {children}
      </button>
    );
  }
);

HeaderActionButton.displayName = 'HeaderActionButton';
