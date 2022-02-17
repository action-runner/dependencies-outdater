import * as core from "@actions/core";
import * as github from "@actions/github";
import simpleGit from "simple-git";

export class GithubClient {
  githubToken: string;

  constructor(token: string) {
    this.githubToken = token;
  }

  /**
   * Create a pull request with the list of packages to update
   */
  public async createPullRequest(
    sha: string,
    props: { base?: string; body: string }
  ) {
    const client = github.getOctokit(this.githubToken);
    // add a comment to the pull request instead of creating a new one
    if (github.context.eventName === "pull_request") {
      // Get the pull request number
      const pullRequestNumber = github.context.payload.pull_request?.number;
      if (pullRequestNumber) {
        core.info(`Adding comment to pull request ${pullRequestNumber}`);
        // Add a comment to the pull request
        await client.rest.issues.createComment({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          issue_number: pullRequestNumber,
          body: props.body,
        });
      } else {
        core.setFailed("Could not find pull request number");
      }
    }

    if (await this.checkPullRequestExists(sha)) {
      return;
    }

    // If user has specified a base branch, use it, otherwise use the default
    core.info(`Creating pull request for ${sha}`);
    const result = await client.rest.pulls.create({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      title: this.getTitle(sha),
      head: `dependencies-update-${sha}`,
      base: props.base ?? github.context.ref,
      body: props.body,
    });

    return result;
  }

  /**
   * Returns the sha of the latest commit
   * @returns SHA for the latest commit
   */
  public getCommit(props: { branch?: string }) {
    if (props.branch) {
      //TODO: support branches
    }
    return github.context.sha;
  }

  private getTitle(sha: string) {
    return `Update dependencies ${sha}`;
  }

  private getBranch(sha: string) {
    return `dependencies-update-${sha}`;
  }

  /**
   *
   * @returns {Promise<Update[]>} Whether there exists a pull request for this commit
   */
  private async checkPullRequestExists(sha: string): Promise<boolean> {
    const title = this.getTitle(sha);
    const client = github.getOctokit(this.githubToken);
    const result = await client.rest.search.issuesAndPullRequests({ q: title });
    if (result.data.total_count > 0) {
      return true;
    }
    return false;
  }

  async addAndCommit() {
    const git = simpleGit();
    await git.add("./*");
    await git.commit("Depedencies_outdater: Update dependencies");
    await git.push("origin", this.getBranch(this.getCommit({})), {});
  }
}
