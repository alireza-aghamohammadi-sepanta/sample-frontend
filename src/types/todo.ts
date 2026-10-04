export interface Asset {
  id: string;
  user_id: string;
  gcs_path: string;
  public_url: string;
  media_type: string;
  created_at: string;
}

export interface TodoList {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  list_id: string;
  title: string;
  description: string | null;
  due_date?: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  assets: Asset[];
}

export type FilterStatus = 'all' | 'active' | 'completed';
