export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  deadline: string; // YYYY-MM-DD
  priority: Priority;
  status: TaskStatus;
  category: string;
  reminder?: string;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  transaction_date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface FileItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  storage_path: string;
  file_type: string; // e.g. 'pdf', 'docx', 'pptx', 'image'
  file_size: number; // in bytes
  created_at: string;
  url?: string;
}

export interface WishlistSubTarget {
  id: string;
  title: string;
  amount: number | null;
  completed: boolean;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  name: string;
  description: string;
  category: string;
  target_price: number;
  base_target_price?: number;
  saved_amount: number;
  deadline?: string | null;
  completed: boolean;
  subtasks?: WishlistSubTarget[];
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  currency: string;
  timezone: string;
  theme: 'dark' | 'light';
  is_online: boolean;
  sync_status: 'synced' | 'pending' | 'error';
  last_synced_at?: string;
}

export interface ActivityItem {
  id: string;
  type: 'task' | 'finance' | 'file' | 'wishlist';
  title: string;
  action: 'created' | 'updated' | 'completed' | 'deleted';
  timestamp: string;
}

export interface DashboardSummary {
  today_tasks_count: number;
  pending_tasks_count: number;
  completed_tasks_count: number;
  income_today: number;
  expense_today: number;
  total_income: number;
  total_expense: number;
  current_balance: number;
  files_count: number;
  wishlist_progress_average: number;
}

export interface UserAccount {
  id: string;
  username: string;
  created_at: string;
  email?: string;
  avatar_url?: string;
}
