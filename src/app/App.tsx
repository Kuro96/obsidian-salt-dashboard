import * as React from 'react';
import { GridLayout } from './layout/GridLayout';

export const App: React.FC = () => {
  return (
    <div className="dashboard-container">
      <GridLayout />
    </div>
  );
};
