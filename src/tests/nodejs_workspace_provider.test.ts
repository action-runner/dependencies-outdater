import git from "simple-git";
import {GithubClient} from "../providers/client/github";
import {NodeJSWorkspaceProvider} from "../providers/nodejs/nodejs_workspace";
import fs from "fs";

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
    readFileSync: jest.fn().mockReturnValue(
        JSON.stringify({
            workspaces: [
                "packages"
            ],
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
jest.mock("glob", () => ({
    sync: jest.fn().mockReturnValue(["a", "b"])
}))

describe("Given a node js workspace provider", () => {
    const githubClient = new GithubClient("mock_token");
    let nodejsProvider: NodeJSWorkspaceProvider;

    beforeEach(() => {
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

        const mockUpdater = {
            run: jest.fn().mockReturnValue({
                mock_dep: "1.0.1",
                mock_dev_dep: "1.0.1",
            }),
        };
        nodejsProvider = new NodeJSWorkspaceProvider({
            githubClient: githubClient,
            pkgManager: "npm",
            checkUpdater: mockUpdater,
        });
    });

    test("Should return a list of updates", async () => {
        const updates = await nodejsProvider.checkUpdates({skip: false});
        expect(updates).toHaveLength(4);
        expect(updates[0].packageFilePath).toBe("a")
        expect(updates[1].packageFilePath).toBe("a")
        expect(updates[2].packageFilePath).toBe("b")
        expect(updates[3].packageFilePath).toBe("b")
        updates.forEach((u) => {
            expect(u.currentVersion).toBeDefined();
            expect(u.newVersion).toBeDefined();
            expect(u.name).toBeDefined();
        });

        // Check update suggestions
        expect(nodejsProvider.updateSuggestions.length).toBe(2)
        expect(nodejsProvider.updateSuggestions[0].fileName).toBe("a")
        expect(nodejsProvider.updateSuggestions[1].fileName).toBe("b")
    });

    test("Should return a partial list of updates", async () => {
        const mockUpdater = {
            run: jest.fn().mockResolvedValueOnce({
                mock_dep: "1.0.1",
                mock_dev_dep: "1.0.1",
            }).mockResolvedValue({}),
        };
        nodejsProvider = new NodeJSWorkspaceProvider({
            githubClient: githubClient,
            pkgManager: "npm",
            checkUpdater: mockUpdater,
        });

        const updates = await nodejsProvider.checkUpdates({skip: false});
        expect(updates).toHaveLength(2);
        expect(updates[0].packageFilePath).toBe("a")
        // Check update suggestions
        expect(nodejsProvider.updateSuggestions.length).toBe(1)
        expect(nodejsProvider.updateSuggestions[0].fileName).toBe("a")
    });


    test("Should return an empty list of updates", async () => {
        const mockUpdater = {
            run: jest.fn().mockReturnValue({}),
        };

        nodejsProvider = new NodeJSWorkspaceProvider({
            githubClient: githubClient,
            pkgManager: "npm",
            checkUpdater: mockUpdater,
        });

        const updates = await nodejsProvider.checkUpdates({skip: false});
        expect(updates).toHaveLength(0);
    });

});
