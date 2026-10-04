export type TaskComment = {
  id: string;
  task_id: string;
  author_id: string;
  author_name: string;
  content: string;
  mentions: CommentMention[];
  created_at: string;
  updated_at: string;
};

export type CommentMention = {
  user_id: string;
  display_name: string;
};

export type CommentInput = {
  content: string;
  mentioned_user_ids?: string[];
};
