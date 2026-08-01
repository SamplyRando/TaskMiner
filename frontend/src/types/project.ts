import type { PaginationParams } from "@/types/pagination";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
};

export type ProjectInput = {
  name: string;
  description: string | null;
};

export type ProjectSort =
  | "created_at"
  | "updated_at"
  | "name"
  | "-created_at"
  | "-updated_at"
  | "-name";

export type ProjectListParams = PaginationParams & {
  search?: string;
  workspace_id?: string;
  sort: ProjectSort;
};
