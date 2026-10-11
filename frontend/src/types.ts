export interface Task {
  id: number;
  title: string;
  description: string;
  assignee: string;
  status: 'Todo' | 'In Progress' | 'Done' | string;
  created_at: string;
}

export type DemoMode = 
  | 'overview'
  | 'self-healing'
  | 'dashboard'
  | 'version-a' 
  | 'version-b' 
  | 'broken' 
  | 'ambiguous' 
  | 'shopping-a' 
  | 'shopping-b' 
  | 'test-runner';

export interface TaskFormPayload {
  title: string;
  description: string;
  assignee: string;
  status: string;
}

export interface Order {
  id: number;
  product_name: string;
  price: number;
  quantity: number;
  customer_name: string;
  status: string;
  created_at: string;
}
