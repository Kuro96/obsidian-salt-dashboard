import React, { useEffect, useRef } from 'react';
import { MarkdownRenderer, Component } from 'obsidian';
import { useObsidianApp } from '../../app/context/ObsidianContext';

interface MarkdownContentProps {
  content: string;
  sourcePath?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export const MarkdownContent = ({
  content,
  sourcePath = '',
  className = '',
  style,
  onClick,
}: MarkdownContentProps) => {
  const app = useObsidianApp();
  const containerRef = useRef<HTMLDivElement>(null);
  // Use a ref to keep track of the current component so we can unload it properly
  const componentRef = useRef<Component | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    // Don't empty if we want to diff? No, standard practice is empty and re-render.
    container.empty();

    // Unload previous component if exists
    if (componentRef.current) {
      componentRef.current.unload();
    }

    const component = new Component();
    componentRef.current = component;
    component.load(); // Must load the component so lifecycle hooks run

    MarkdownRenderer.render(app, content, container, sourcePath, component);

    // Handle Internal Links
    const internalLinks = container.querySelectorAll('a.internal-link');
    internalLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation(); // Stop TodoItem click handler
        const href = link.getAttribute('data-href') || link.getAttribute('href');
        if (href) {
          app.workspace.openLinkText(href, sourcePath);
        }
      });

      link.addEventListener('mouseenter', e => {
        app.workspace.trigger('hover-link', {
          event: e,
          source: 'preview',
          hoverParent: container,
          targetEl: link,
          linktext: link.getAttribute('data-href') || link.getAttribute('href'),
          sourcePath: sourcePath,
        });
      });
    });

    return () => {
      if (componentRef.current) {
        componentRef.current.unload();
        componentRef.current = null;
      }
    };
  }, [content, sourcePath, app]);

  return (
    <div
      ref={containerRef}
      className={`markdown-rendered ${className}`}
      style={{ userSelect: 'text', WebkitUserSelect: 'text', ...style }}
      onClick={onClick}
    />
  );
};
