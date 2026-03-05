import * as React from 'react';
import { Task } from '../../../app/types';
import { MarkdownContent } from '../../../shared/components/MarkdownContent';

interface TaskDetailModalProps {
  data: {
    date: string;
    daily: { text: string; completed: boolean }[];
    regular: { text: string; completed: boolean }[];
    jottings: { text: string; completed: boolean }[];
  };
  onClose: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ data, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📅 {data.date} Completed Tasks</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {data.daily.length > 0 && (
            <div className="task-group">
              <h4>🔄 Daily Tasks ({data.daily.length})</h4>
              <ul>
                {data.daily.map((t, i) => (
                  <li key={i} className="completed">
                    ☑ <MarkdownContent content={t.text} style={{ display: 'inline' }} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.regular.length > 0 && (
            <div className="task-group">
              <h4>📝 Regular Tasks ({data.regular.length})</h4>
              <ul>
                {data.regular.map((t, i) => (
                  <li key={i} className="completed">
                    ☑ <MarkdownContent content={t.text} style={{ display: 'inline' }} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.jottings.length > 0 && (
            <div className="task-group">
              <h4>✍️ Jottings Tasks ({data.jottings.length})</h4>
              <ul>
                {data.jottings.map((t, i) => (
                  <li key={i} className="completed">
                    ☑ <MarkdownContent content={t.text} style={{ display: 'inline' }} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.daily.length === 0 && data.regular.length === 0 && data.jottings.length === 0 && (
            <p>No tasks details available.</p>
          )}
        </div>
      </div>
    </div>
  );
};
