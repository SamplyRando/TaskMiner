import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import {
  acceptInvitation,
  createWorkspaceInvitation,
  getInvitation,
  listWorkspaceInvitations,
  revokeInvitation,
} from "@/api/invitations";
import {
  firstWorkspace,
  invitationFixture,
  invitationListFixture,
} from "@/test/invitation-fixtures";

describe("invitations API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists invitations with server pagination, search, and sorting", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: invitationListFixture });
    const params = {
      limit: 20,
      search: "ada",
      skip: 20,
      sort: "-email",
    } as const;

    await expect(
      listWorkspaceInvitations(firstWorkspace.id, params),
    ).resolves.toEqual(invitationListFixture);
    expect(get).toHaveBeenCalledWith(
      `/workspaces/${firstWorkspace.id}/invitations`,
      { params },
    );
  });

  it("creates an invitation on the existing workspace endpoint", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: invitationFixture });
    const data = { email: invitationFixture.email, role: "member" } as const;

    await expect(
      createWorkspaceInvitation(firstWorkspace.id, data),
    ).resolves.toEqual(invitationFixture);
    expect(post).toHaveBeenCalledWith(
      `/workspaces/${firstWorkspace.id}/invitations`,
      data,
    );
  });

  it("loads an invitation by encoded token", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue({ data: invitationFixture });

    await getInvitation("token/with spaces");

    expect(get).toHaveBeenCalledWith("/invitations/token%2Fwith%20spaces");
  });

  it("accepts an invitation through the existing action endpoint", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: invitationFixture });

    await acceptInvitation(invitationFixture.token);

    expect(post).toHaveBeenCalledWith(
      `/invitations/${invitationFixture.token}/accept`,
    );
  });

  it("revokes or declines through the existing revoke endpoint", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: invitationFixture });

    await revokeInvitation(invitationFixture.token);

    expect(post).toHaveBeenCalledWith(
      `/invitations/${invitationFixture.token}/revoke`,
    );
  });
});
