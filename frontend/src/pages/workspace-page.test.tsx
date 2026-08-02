import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
  updateWorkspace,
} from "@/api/workspace";
import { getUserPreferences } from "@/api/settings";
import { WorkspacePage } from "@/pages/workspace-page";
import { renderWithQuery } from "@/test/query-wrapper";
import { workspaceFixture } from "@/test/resource-fixtures";
import { settingsPreferencesFixture } from "@/test/settings-fixtures";

vi.mock("@/api/workspace", () => ({
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
}));
vi.mock("@/api/settings", () => ({ getUserPreferences: vi.fn() }));

const mockedCreateWorkspace = vi.mocked(createWorkspace);
const mockedDeleteWorkspace = vi.mocked(deleteWorkspace);
const mockedListWorkspaces = vi.mocked(listWorkspaces);
const mockedUpdateWorkspace = vi.mocked(updateWorkspace);
const mockedGetPreferences = vi.mocked(getUserPreferences);

describe("WorkspacePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPreferences.mockResolvedValue(settingsPreferencesFixture);
    mockedListWorkspaces.mockResolvedValue([workspaceFixture]);
  });

  it("loads and searches the real workspace list", async () => {
    const user = userEvent.setup();
    renderWithQuery(<WorkspacePage />);

    expect(await screen.findByText(workspaceFixture.name)).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Rechercher un workspace" }),
      "introuvable",
    );
    expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
  });

  it("creates a workspace and refreshes the list", async () => {
    const user = userEvent.setup();
    const createdWorkspace = {
      ...workspaceFixture,
      id: "00000000-0000-4000-8000-000000000010",
      name: "Workspace Beta",
    };
    mockedCreateWorkspace.mockResolvedValue(createdWorkspace);
    mockedListWorkspaces
      .mockResolvedValueOnce([workspaceFixture])
      .mockResolvedValue([workspaceFixture, createdWorkspace]);
    renderWithQuery(<WorkspacePage />);

    await screen.findByText(workspaceFixture.name);
    await user.click(screen.getByRole("button", { name: "Nouveau workspace" }));
    await user.type(
      screen.getByRole("textbox", { name: "Nom" }),
      "Workspace Beta",
    );
    await user.click(screen.getByRole("button", { name: "Créer" }));

    await waitFor(() => {
      expect(mockedCreateWorkspace).toHaveBeenCalledWith(
        {
          description: null,
          name: "Workspace Beta",
        },
        expect.anything(),
      );
    });
    expect(await screen.findByText("Workspace Beta")).toBeInTheDocument();
  });

  it("optimistically updates a workspace", async () => {
    const user = userEvent.setup();
    mockedUpdateWorkspace.mockResolvedValue({
      ...workspaceFixture,
      name: "Workspace renommé",
    });
    renderWithQuery(<WorkspacePage />);

    await screen.findByText(workspaceFixture.name);
    await user.click(
      screen.getByRole("button", {
        name: `Modifier ${workspaceFixture.name}`,
      }),
    );
    const nameInput = screen.getByRole("textbox", { name: "Nom" });
    await user.clear(nameInput);
    await user.type(nameInput, "Workspace renommé");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(mockedUpdateWorkspace).toHaveBeenCalledWith(workspaceFixture.id, {
        description: workspaceFixture.description,
        name: "Workspace renommé",
      });
    });
  });

  it("soft-deletes a workspace through the existing endpoint", async () => {
    const user = userEvent.setup();
    mockedDeleteWorkspace.mockResolvedValue();
    mockedListWorkspaces
      .mockResolvedValueOnce([workspaceFixture])
      .mockResolvedValue([]);
    renderWithQuery(<WorkspacePage />);

    await screen.findByText(workspaceFixture.name);
    await user.click(
      screen.getByRole("button", {
        name: `Supprimer ${workspaceFixture.name}`,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => {
      expect(mockedDeleteWorkspace).toHaveBeenCalledWith(
        workspaceFixture.id,
        expect.anything(),
      );
    });
  });
});
