import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTaskComment,
  deleteTaskComment,
  listTaskComments,
  updateTaskComment,
} from "@/api/comments";
import { apiClient } from "@/api/client";
import type { TaskComment } from "@/types/comment";

const comment: TaskComment = {
  author_id: "user-1",
  author_name: "Ada Lovelace",
  content: "Premier commentaire",
  created_at: "2026-10-03T10:00:00Z",
  id: "comment-1",
  mentions: [],
  task_id: "task-1",
  updated_at: "2026-10-03T10:00:00Z",
};

describe("comments API", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("uses the existing task and comment endpoints", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: [comment] });
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: comment });
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ data: comment });
    const remove = vi
      .spyOn(apiClient, "delete")
      .mockResolvedValue({ data: undefined });

    await expect(listTaskComments("task-1")).resolves.toEqual([comment]);
    await expect(
      createTaskComment("task-1", { content: "Premier commentaire" }),
    ).resolves.toEqual(comment);
    await expect(
      updateTaskComment("comment-1", { content: "Mis à jour" }),
    ).resolves.toEqual(comment);
    await deleteTaskComment("comment-1");

    expect(get).toHaveBeenCalledWith("/tasks/task-1/comments");
    expect(post).toHaveBeenCalledWith("/tasks/task-1/comments", {
      content: "Premier commentaire",
    });
    expect(patch).toHaveBeenCalledWith("/comments/comment-1", {
      content: "Mis à jour",
    });
    expect(remove).toHaveBeenCalledWith("/comments/comment-1");
  });
});
