export interface Task {
  id: number;
  title: string;
  description: string;
  assignee: string;
  status: 'Todo' | 'In Progress' | 'Done' | string;
  created_at: string;
}

export type DemoMode = 'version-a' | 'version-b' | 'broken' | 'ambiguous';

export interface TaskFormPayload {
  title: string;
  description: string;
  assignee: string;
  status: string;
}
