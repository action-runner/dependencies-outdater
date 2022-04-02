import fs from "fs";
import github from "@actions/github";
import git from "simple-git";
import { application } from "../application";
import { commentFinder } from "@action-runner/common";

jest.mock("@action-runner/common");
jest.mock("child_process", () => ({
  exec: jest.fn((cmd, callback) => callback(undefined)),
}));
jest.mock("@action-runner/common");
jest.mock("@actions/core", () => ({
  getInput: jest.fn().mockReturnValue("nodejs"),
  setFailed: jest.fn(),
  info: jest.fn(),
  startGroup: jest.fn(),
  endGroup: jest.fn(),
}));
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
jest.mock("npm-check-updates", () => ({
  run: jest.fn().mockReturnValue({
    mock_dep: "1.0.1",
    mock_dev_dep: "1.0.1",
  }),
}));

describe("Given a application", () => {
  let mockCheckout: jest.Mock;
  let mockPush: jest.Mock;
  let mockCommit: jest.Mock;
  let mockAdd: jest.Mock;
  let mockFetch: jest.Mock;
  let updateComment: jest.Mock;
  let createComment: jest.Mock;
  let createPull: jest.Mock;
  let mockCheckoutLocal: jest.Mock;
  let mockStash: jest.Mock;
  let mockApply: jest.Mock;
  let mockBranch: jest.Mock;

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
  });

  describe("When running the application in pull request mode", () => {
    beforeEach(() => {
      mockCheckout = jest.fn();
      mockPush = jest.fn();
      mockCommit = jest.fn();
      mockAdd = jest.fn();
      mockFetch = jest.fn();
      updateComment = jest.fn();
      createComment = jest.fn();
      createPull = jest.fn();
      mockStash = jest.fn();
      mockApply = jest.fn();
      mockCheckoutLocal = jest.fn();
      mockBranch = jest.fn();

      (git as any).mockImplementation(() => ({
        checkout: mockCheckout,
        add: mockAdd,
        commit: mockCommit,
        push: mockPush,
        addConfig: jest.fn(),
        fetch: mockFetch,
        branch: mockBranch,
      }));

      (github.getOctokit as any).mockReturnValue({
        rest: {
          issues: {
            updateComment: updateComment,
            createComment: createComment,
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
    });

    test("Should not create a new branch", async () => {
      const result = await application();
      expect(result?.totalUpdateSuggestions).toHaveLength(1);
      expect(result?.totalPackages).toHaveLength(2);
      expect(mockAdd).toBeCalledTimes(0);
      expect(mockPush).toBeCalledTimes(0);
      expect(mockCheckout).toBeCalledTimes(0);
    });
  });

  describe("When running the application not in pull request mode", () => {
    beforeEach(() => {
      mockCheckout = jest.fn();
      mockPush = jest.fn();
      mockCommit = jest.fn();
      mockAdd = jest.fn();
      mockFetch = jest.fn();
      updateComment = jest.fn();
      createComment = jest.fn();
      createPull = jest.fn();
      mockStash = jest.fn();
      mockApply = jest.fn();
      mockCheckoutLocal = jest.fn();
      mockBranch = jest.fn().mockReturnValue({ all: [] });

      (git as any).mockImplementation(() => ({
        checkout: mockCheckout,
        add: mockAdd,
        commit: mockCommit,
        push: mockPush,
        addConfig: jest.fn(),
        fetch: mockFetch,
        checkoutLocalBranch: mockCheckoutLocal,
        stash: mockStash,
        applyPatch: mockApply,
        branch: mockBranch,
      }));

      (github.getOctokit as any).mockReturnValue({
        rest: {
          issues: {
            updateComment: updateComment,
            createComment: createComment,
          },
          search: {
            issuesAndPullRequests: jest
              .fn()
              .mockReturnValue({ data: { total_count: 0 } }),
          },
          pulls: {
            create: createPull,
          },
        },
      });

      (github.context as any) = {
        eventName: "schedule",
        sha: "mock_commit",
        repo: {
          owner: "mock_owner",
          repo: "mock_repo",
        },
        payload: {},
      };
    });

    test("Should create a new branch", async () => {
      const result = await application();
      expect(result?.totalUpdateSuggestions).toHaveLength(1);
      expect(result?.totalPackages).toHaveLength(2);
      expect(mockAdd).toBeCalledTimes(1);
      expect(mockPush).toBeCalledTimes(1);
      expect(mockCheckoutLocal).toHaveBeenCalledWith(
        "dependencies-update-mock_commit"
      );
      expect(mockFetch).toBeCalledTimes(1);
      expect(createPull).toBeCalledTimes(1);
      expect(createComment).toBeCalledTimes(0);
      expect(updateComment).toBeCalledTimes(0);
    });

    test("Should update existing pull request's comment", async () => {
      (github.getOctokit as any).mockReturnValue({
        rest: {
          issues: {
            updateComment: updateComment,
            createComment: createComment,
          },
          search: {
            issuesAndPullRequests: jest.fn().mockReturnValue({
              data: { total_count: 1, items: [{ number: 1 }] },
            }),
          },
          pulls: {
            create: createPull,
          },
        },
      });
      (commentFinder.findComment as any).mockReturnValue({ id: 1 });

      const result = await application();
      expect(result?.totalUpdateSuggestions).toHaveLength(1);
      expect(result?.totalPackages).toHaveLength(2);
      expect(mockAdd).toBeCalledTimes(1);
      expect(mockPush).toBeCalledTimes(1);
      expect(mockCheckoutLocal).toHaveBeenCalledWith(
        "dependencies-update-mock_commit"
      );
      expect(mockFetch).toBeCalledTimes(1);
      expect(createPull).toBeCalledTimes(0);
      expect(createComment).toBeCalledTimes(0);
      expect(updateComment).toBeCalledTimes(1);
    });
  });
});
