import { GithubClient } from "../providers/client/github";
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
});
