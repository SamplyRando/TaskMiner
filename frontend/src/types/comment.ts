export type TaskComment = {
  id: string;
  task_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type CommentInput = {
  content: string;
};
