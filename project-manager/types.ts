
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Status = 'To Do' | 'In Progress' | 'Review' | 'Done';

export interface Ticket {
  id: string; // Internal unique ID or the Jira Key
  key: string;
  summary: string;
  type: string;
  priority: Priority;
  status: Status;
  dueDate: string;
  createdDate?: string;
  notes: string;
}

export interface TicketStats {
  status: string;
  count: number;
}
