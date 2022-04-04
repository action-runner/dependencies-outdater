import { GithubClient } from "../providers/client/github";
import github from "@actions/github";
import git from "simple-git";

jest.mock("simple-git");
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

const mockComment = {
  id: 1,
  body: "Update dependencies for pull request #1",
};

describe("Given a github client", () => {
  const githubClient = new GithubClient("mock_token");
  const mockCreate = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();

  afterEach(() => {
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
  });

  test("Should create a new comment", async () => {
    const mockAsyncIterator = {
      async *[Symbol.asyncIterator]() {
        const data = {
          data: [],
        };

        yield data;
      },
    };

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

    (github.getOctokit as any).mockReturnValue({
      rest: {
        issues: {
          listComments: jest.fn(),
          createComment: mockCreate,
          updateComment: mockUpdate,
          deleteComment: mockDelete,
        },
      },
      paginate: {
        iterator: jest.fn().mockReturnValue(mockAsyncIterator),
      },
    });

    await githubClient.createPullRequest("mock_sha", {
      body: "",
      deleteComment: false,
      packages: [
        {
          name: "mock_package",
          currentVersion: "1.0.0",
          newVersion: "2.0.0",
          packageFilePath: "package.json",
        },
      ],
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(0);
    expect(mockDelete).toHaveBeenCalledTimes(0);
  });

  test("Should not create a new comment", async () => {
    const mockAsyncIterator = {
      async *[Symbol.asyncIterator]() {
        const data = {
          data: [],
        };

        yield data;
      },
    };

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

    (github.getOctokit as any).mockReturnValue({
      rest: {
        issues: {
          listComments: jest.fn(),
          createComment: mockCreate,
          updateComment: mockUpdate,
          deleteComment: mockDelete,
        },
      },
      paginate: {
        iterator: jest.fn().mockReturnValue(mockAsyncIterator),
      },
    });

    await githubClient.createPullRequest("mock_sha", {
      body: "",
      deleteComment: false,
      packages: [],
    });
    expect(mockCreate).toHaveBeenCalledTimes(0);
    expect(mockUpdate).toHaveBeenCalledTimes(0);
    expect(mockDelete).toHaveBeenCalledTimes(0);
  });

  test("Should update comment", async () => {
    const mockAsyncIterator = {
      async *[Symbol.asyncIterator]() {
        const data = {
          data: [mockComment],
        };

        yield data;
      },
    };

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

    (github.getOctokit as any).mockReturnValue({
      rest: {
        issues: {
          listComments: jest.fn(),
          createComment: mockCreate,
          updateComment: mockUpdate,
          deleteComment: mockDelete,
        },
      },
      paginate: {
        iterator: jest.fn().mockReturnValue(mockAsyncIterator),
      },
    });

    await githubClient.createPullRequest("mock_sha", {
      body: "",
      deleteComment: false,
      packages: [],
    });
    expect(mockCreate).toHaveBeenCalledTimes(0);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledTimes(0);
  });

  test("Should delete comment", async () => {
    const mockAsyncIterator = {
      async *[Symbol.asyncIterator]() {
        const data = {
          data: [mockComment],
        };

        yield data;
      },
    };

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

    (github.getOctokit as any).mockReturnValue({
      rest: {
        issues: {
          listComments: jest.fn(),
          createComment: mockCreate,
          updateComment: mockUpdate,
          deleteComment: mockDelete,
        },
      },
      paginate: {
        iterator: jest.fn().mockReturnValue(mockAsyncIterator),
      },
    });

    await githubClient.createPullRequest("mock_sha", {
      body: "",
      deleteComment: true,
      packages: [],
    });
    expect(mockCreate).toHaveBeenCalledTimes(0);
    expect(mockUpdate).toHaveBeenCalledTimes(0);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  test("Should return a valid branch name", () => {
    const name = githubClient.getBranch("mock");
    expect(name).toBe("dependencies-update-mock");
  });

  test("Should add and commit correctly", async () => {
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

    await githubClient.addAndCommit();
    expect(mockCommit).toBeCalledTimes(1);
    expect(mockAdd).toBeCalledTimes(1);
    expect(mockPush).toBeCalledTimes(1);
    expect(mockCommit).toBeCalledWith(`fix: ${githubClient.getTitle()}`);
  });

  test("Should switch to correct local branch", async () => {
    (github.context as any) = {
      sha: "mock_sha",
    };

    const mockCheckout = jest.fn();
    const mockPush = jest.fn();
    const mockCommit = jest.fn();
    const mockAdd = jest.fn();
    const mockFetch = jest.fn();
    const mockBranch = jest.fn().mockReturnValue({ all: [] });
    const mockCheckoutLocal = jest.fn();
    const mockStash = jest.fn();
    const mockApply = jest.fn();

    (git as any).mockImplementation(() => ({
      checkoutBranch: mockCheckout,
      add: mockAdd,
      commit: mockCommit,
      push: mockPush,
      addConfig: jest.fn(),
      fetch: mockFetch,
      branch: mockBranch,
      checkoutLocalBranch: mockCheckoutLocal,
      stash: mockStash,
      applyPatch: mockApply,
    }));

    await githubClient.switchToBranch();
    expect(mockFetch).toBeCalledTimes(1);
    expect(mockCheckout).toBeCalledTimes(0);
    expect(mockCheckoutLocal).toBeCalledTimes(1);
    expect(mockCheckoutLocal).toBeCalledWith("dependencies-update-mock_sha");
  });
});
