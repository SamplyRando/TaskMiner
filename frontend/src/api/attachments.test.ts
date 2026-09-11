import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteAttachment,
  downloadAttachment,
  listTaskAttachments,
  uploadTaskAttachment,
} from "@/api/attachments";
import { apiClient } from "@/api/client";
import type { Attachment } from "@/types/attachment";

const attachment: Attachment = {
  content_type: "application/pdf",
  created_at: "2026-09-10T10:00:00Z",
  file_size: 2048,
  filename: "report.pdf",
  id: "attachment-1",
  task_id: "task-1",
  updated_at: "2026-09-10T10:00:00Z",
};

describe("attachments API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists attachments through the task-scoped endpoint", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: [attachment] });

    await expect(listTaskAttachments("task-1")).resolves.toEqual([attachment]);
    expect(get).toHaveBeenCalledWith("/tasks/task-1/attachments");
  });

  it("uploads browser FormData without overriding its multipart boundary", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: attachment });
    const file = new File(["content"], "report.pdf", {
      type: "application/pdf",
    });

    await expect(uploadTaskAttachment("task-1", file)).resolves.toEqual(
      attachment,
    );

    expect(post).toHaveBeenCalledTimes(1);
    const call = post.mock.calls[0];
    expect(call).toHaveLength(2);
    expect(call?.[0]).toBe("/tasks/task-1/attachments");
    expect(call?.[1]).toBeInstanceOf(FormData);
    expect((call?.[1] as FormData).get("file")).toBe(file);
  });

  it("downloads attachment content as a blob", async () => {
    const blob = new Blob(["content"], { type: "application/pdf" });
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: blob });

    await expect(downloadAttachment("attachment-1")).resolves.toBe(blob);
    expect(get).toHaveBeenCalledWith("/attachments/attachment-1", {
      responseType: "blob",
    });
  });

  it("deletes through the attachment-scoped endpoint", async () => {
    const remove = vi
      .spyOn(apiClient, "delete")
      .mockResolvedValue({ data: undefined });

    await deleteAttachment("attachment-1");
    expect(remove).toHaveBeenCalledWith("/attachments/attachment-1");
  });
});
