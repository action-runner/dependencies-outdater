import { GithubClient } from "../providers/client/github";
import { NodeJSProvider } from "../providers/nodejs/nodejs";
import github from "@actions/github";
import { commentFinder } from "@action-runner/common";
import fs from "fs";
import { PackageFile } from "../providers/types/nodejs";
import { Provider } from "../providers/provider";

jest.mock("child_process", () => ({
  exec: jest.fn((cmd, callback) => callback(undefined)),
}));
jest.mock("@action-runner/common");
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
      issues: {
        updateComment: jest.fn(),
      },
    },
  }),
}));
jest.mock("simple-git");
jest.mock("fs", () => ({
  existsSync: jest.fn().mockResolvedValue(true),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
}));
jest.mock("ignore");
jest.mock("child_process");
jest.mock("npm-check-updates");

describe("Given a node js provider", () => {
  const githubClient = new GithubClient("mock_token");
  let nodejsProvider: NodeJSProvider;

  beforeEach(() => {
    (fs.readFileSync as any).mockImplementation(() =>
      JSON.stringify({
        dependencies: {
          mock_dep: "1.0.0",
        },
        devDependencies: {
          mock_dev_dep: "1.0.0",
        },
      })
    );

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

  test("Should return a list of updates 1", async () => {
    const { updates } = await nodejsProvider.checkUpdates({
      skip: false,
    });
    expect(updates).toHaveLength(2);
    updates.forEach((u) => {
      expect(u.currentVersion).toBeDefined();
      expect(u.newVersion).toBeDefined();
      expect(u.name).toBeDefined();
    });

    const parsedContent: PackageFile = JSON.parse(
      nodejsProvider.updateSuggestions[0].content
    );

    expect(parsedContent.dependencies?.mock_dep).toBeDefined();
    expect(parsedContent.dependencies?.mock_dev_dep).toBeUndefined();
    expect(parsedContent.devDependencies?.mock_dep).toBeUndefined();
    expect(parsedContent.devDependencies?.mock_dev_dep).toBeDefined();
  });

  test("Should return a list of updates 2", async () => {
    const mockUpdater = {
      run: jest.fn().mockReturnValue({
        mock_dep: "1.0.1",
      }),
    };
    nodejsProvider = new NodeJSProvider({
      githubClient: githubClient,
      pkgManager: "npm",
      checkUpdater: mockUpdater,
    });

    (fs.readFileSync as any).mockImplementation(() =>
      JSON.stringify({
        devDependencies: {
          mock_dev_dep: "1.0.0",
        },
      })
    );
    const { updates } = await nodejsProvider.checkUpdates({
      skip: false,
    });
    expect(updates).toHaveLength(1);
  });

  test("Should return a list of updates 3", async () => {
    const mockUpdater = {
      run: jest.fn().mockReturnValue({
        mock_dev_dep: "1.0.1",
      }),
    };
    nodejsProvider = new NodeJSProvider({
      githubClient: githubClient,
      pkgManager: "npm",
      checkUpdater: mockUpdater,
    });

    (fs.readFileSync as any).mockImplementation(() =>
      JSON.stringify({
        dependencies: {
          mock_dev_dep: "1.0.0",
        },
      })
    );
    const { updates } = await nodejsProvider.checkUpdates({
      skip: false,
    });
    expect(updates).toHaveLength(1);
  });

  test("Should return an empty list of updates", async () => {
    const mockUpdater = {
      run: jest.fn().mockReturnValue({}),
    };

    nodejsProvider = new NodeJSProvider({
      githubClient: githubClient,
      pkgManager: "npm",
      checkUpdater: mockUpdater,
    });

    const { updates } = await nodejsProvider.checkUpdates({
      skip: false,
    });
    expect(updates).toHaveLength(0);
  });

  test("Should create a new pull request", async () => {
    const { updates } = await nodejsProvider.checkUpdates({
      skip: false,
    });
    expect(
      Provider.getComment({
        title: "Hello world",
        updateSuggestions: [],
        packages: [
          {
            currentVersion: "1.0.0",
            packageFilePath: "package.json",
            name: "mock_dep",
            newVersion: "1.0.1",
          },
        ],
        sha: "mock_sha",
      })
    ).toContain("| mock_dep | package.json | 1.0.0 | 1.0.1 |");
    expect(updates).toHaveLength(2);
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
    const updateSuggestions = [
      {
        fileName: "package.json",
        language: "json",
        content: JSON.stringify(mockData, null, 2),
      },
    ];

    const comment = Provider.getComment({
      title: "",
      packages: [
        {
          currentVersion: "1.0.0",
          newVersion: "1.0.1",
          packageFilePath: "package.json",
          name: "mock_dep",
        },
      ],
      sha: "mock_sha",
      updateSuggestions: updateSuggestions,
    });
    expect(comment).toContain("### Suggested updates");
    expect(comment).toContain("json");
    expect(comment).toContain("package.json");
    expect(comment).toContain("mock_dep");
  });

  test("Should generate correct update suggestions", async () => {
    (github.getOctokit as any).mockReturnValue({
      rest: {
        issues: {
          updateComment: jest.fn(),
        },
      },
    });

    (github.context as any) = {
      eventName: "pull_request",
      repo: {
        owner: "mock_owner",
        repo: "mock_repo",
      },
      payload: {
        pull_request: {
          number: 1,
        },
      },
    };

    const mockComment = jest.fn().mockReturnValue({ updateComment: jest.fn() });

    (commentFinder.findComment as any).mockReturnValue(mockComment);
    await nodejsProvider.checkUpdates({ skip: false });
  });
});
