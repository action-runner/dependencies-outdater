import { GithubClient } from "../providers/client/github";
import { NodeJSProvider } from "../providers/nodejs/nodejs";
import git from "simple-git";
import github from "@actions/github";

jest.mock("@actions/core");
jest.mock("@actions/github", () => ({
  context: {
    sha: "mock_sha",
    repo: {
      owner: "mock_owner",
      repo: "mock_repo",
    },
  },
  getOctokit: jest.fn().mockReturnValue({
    rest: {
      search: {
        issuesAndPullRequests: jest.fn().mockResolvedValue({
          data: {
            total_count: 1,
          },
        }),
      },
    },
  }),
}));
jest.mock("simple-git");
jest.mock("fs", () => ({
  existsSync: jest.fn().mockResolvedValue(true),
  readFileSync: jest.fn().mockReturnValue(
    JSON.stringify({
      dependencies: {
        mock_dep: "1.0.0",
      },
      devDependencies: {
        mock_dev_dep: "1.0.0",
      },
    })
  ),
  writeFileSync: jest.fn(),
}));
jest.mock("ignore");
jest.mock("child_process");
jest.mock("npm-check-updates");

describe("Given a node js provider", () => {
  const githubClient = new GithubClient("mock_token");
  let nodejsProvider: NodeJSProvider;

  beforeEach(() => {
    const mockUpdater = {
      run: jest.fn().mockReturnValue({
        mock_dep: "1.0.1",
        mock_dev_dep: "1.0.1",
      }),
    };
    nodejsProvider = new NodeJSProvider({
      githubClient: githubClient,
      pkgManager: "npm",
      checkUpdater: mockUpdater,
    });
  });

  test("Should return a list of updates", async () => {
    const mockCheckout = jest.fn();
    const mockPush = jest.fn();
    const mockCommit = jest.fn();
    const mockAdd = jest.fn();

    (git as any).mockImplementation(() => ({
      checkout: mockCheckout,
      add: mockAdd,
      commit: mockCommit,
      push: mockPush,
      addConfig: jest.fn(),
    }));

    const updates = await nodejsProvider.checkUpdates({ skip: false });
    expect(updates).toHaveLength(2);
    updates.forEach((u) => {
      expect(u.currentVersion).toBeDefined();
      expect(u.newVersion).toBeDefined();
      expect(u.name).toBeDefined();
    });

    expect(mockCheckout).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  test("Should return an empty list of updates", async () => {
    const mockCheckout = jest.fn();
    const mockPush = jest.fn();
    const mockCommit = jest.fn();
    const mockAdd = jest.fn();

    const mockUpdater = {
      run: jest.fn().mockReturnValue({}),
    };

    nodejsProvider = new NodeJSProvider({
      githubClient: githubClient,
      pkgManager: "npm",
      checkUpdater: mockUpdater,
    });

    (git as any).mockImplementation(() => ({
      checkout: mockCheckout,
      add: mockAdd,
      commit: mockCommit,
      push: mockPush,
      addConfig: jest.fn(),
    }));

    const updates = await nodejsProvider.checkUpdates({ skip: false });
    expect(updates).toHaveLength(0);
    expect(mockCheckout).toHaveBeenCalledTimes(0);
    expect(mockPush).toHaveBeenCalledTimes(0);
    expect(mockCommit).toHaveBeenCalledTimes(0);
    expect(mockAdd).toHaveBeenCalledTimes(0);
  });

  test("Should create a new pull request", async () => {
    const mockCreate = jest.fn();

    (github.getOctokit as any).mockReturnValue({
      rest: {
        search: {
          issuesAndPullRequests: jest.fn().mockResolvedValue({
            data: {
              total_count: 0,
            },
          }),
        },
        pulls: {
          create: mockCreate,
        },
      },
    });

    const mockCheckout = jest.fn();
    const mockPush = jest.fn();
    const mockCommit = jest.fn();
    const mockAdd = jest.fn();

    (git as any).mockImplementation(() => ({
      checkout: mockCheckout,
      add: mockAdd,
      commit: mockCommit,
      push: mockPush,
      addConfig: jest.fn(),
    }));

    const updates = await nodejsProvider.checkUpdates({ skip: false });
    expect(nodejsProvider.getComment()).toContain(
      "| mock_dep | 1.0.0 | 1.0.1 |"
    );
    expect(updates).toHaveLength(2);
    expect(mockCheckout).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(nodejsProvider.updateSuggestions).toHaveLength(1);
    expect(nodejsProvider.updateSuggestions[0].content).toContain("mock_dep");
    expect(nodejsProvider.updateSuggestions[0].content).toContain(
      "mock_dev_dep"
    );
  });

  test("Should generate correct update suggestions", () => {
    const mockData = {
      depedencies: {
        mock_dep: "1.0.0",
      },
    };
    nodejsProvider.updateSuggestions = [
      {
        fileName: "package.json",
        language: "json",
        content: JSON.stringify(mockData, null, 2),
      },
    ];

    const comment = nodejsProvider.getComment();
    expect(comment).toContain("### Suggested updates");
    expect(comment).toContain("json");
    expect(comment).toContain("package.json");
    expect(comment).toContain("mock_dep");
  });
});
