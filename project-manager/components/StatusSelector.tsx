
import React from 'react';
import { Status } from '../types';

interface StatusSelectorProps {
  currentStatus: Status;
  onStatusChange: (newStatus: Status) => void;
}

const statuses: Status[] = ['To Do', 'In Progress', 'Review', 'Done'];

const StatusSelector: React.FC<StatusSelectorProps> = ({ currentStatus, onStatusChange }) => {
  return (
    <div className="relative inline-block text-left">
      <select
        value={currentStatus}
        onChange={(e) => onStatusChange(e.target.value as Status)}
        className="block w-full pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-white border shadow-sm"
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StatusSelector;
