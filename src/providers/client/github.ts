import * as core from "@actions/core";
import * as github from "@actions/github";
import simpleGit from "simple-git";
import { commentFinder } from "@action-runner/common";
import { Update } from "../types/update";
import git from "simple-git";

export class GithubClient {
  githubToken: string;

  constructor(token: string) {
    this.githubToken = token;
  }

  /**
   * Create a pull request with the list of packages to update.
   * If the current event is a pull request, then create comment only.
   */
  public async createPullRequest(
    sha: string,
    props: {
      base?: string;
      body: string;
      deleteComment: boolean;
      packages: Update[];
    }
  ): Promise<any | undefined> {
    const client = github.getOctokit(this.githubToken);
    // add a comment to the pull request instead of creating a new pull request comment
    if (this.isPullRequest()) {
      // Get the pull request number
      const pullRequestNumber = github.context.payload.pull_request?.number;
      if (pullRequestNumber) {
        core.info(`Adding comment to pull request ${pullRequestNumber}`);
        // Add a comment to the pull request
        await this.createComment(
          pullRequestNumber,
          props.body,
          props.packages,
          props.deleteComment
        );
        return;
      } else {
        core.setFailed("Could not find pull request number");
      }
    }

    const { exist, pullRequestNumber } = await this.checkPullRequestExists(sha);
    if (exist) {
      // if pull request exists, update it
      core.info(
        `Pull request ${pullRequestNumber} already exists, updating comment`
      );
      await this.createComment(
        pullRequestNumber!,
        props.body,
        props.packages,
        props.deleteComment
      );
      return;
    }

    // If user has specified a base branch, use it, otherwise use the default
    core.info(`Creating pull request for ${sha}`);
    return await client.rest.pulls.create({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      title: `fix: ${this.getTitle()}`,
      head: `dependencies-update-${sha}`,
      base: props.base ?? github.context.ref,
      body: props.body,
    });
  }

  /**
   * Create a comment on the pull request.
   * Will update if the comment already exists
   * Will delete the comment if the deleteComment flag is set
   */
  async createComment(
    pullRequestNumber: number,
    content: string,
    packages: Update[],
    deleteComment = false
  ) {
    const client = github.getOctokit(this.githubToken);
    // search for the pull request's comment while content contains the string "Update dependencies"
    // and the comment is not from the github-actions bot
    // and the comment is from this pull request
    core.info(`Creating pull request with comment`);
    const result = await commentFinder.findComment({
      githubToken: this.githubToken,
      pullRequestNumber,
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      onComment: (c) => (c.body ? c.body?.includes(this.getTitle()) : false),
    });
    if (result !== undefined) {
      core.info(`Found comment ${result.id}`);
      // delete the comment
      if (deleteComment) {
        core.info(`Deleting comment ${result.id}`);
        await client.rest.issues.deleteComment({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          comment_id: result.id,
        });
        return;
      }
      // update the comment
      core.info(`Updating comment ${result.id}`);
      await client.rest.issues.updateComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        comment_id: result.id,
        body: content,
      });
    } else {
      if (packages.length === 0) {
        return;
      }
      core.info(`Creating a comment`);
      // create a new comment
      await client.rest.issues.createComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: pullRequestNumber,
        body: content,
      });
    }
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

  /**
   * Get the title
   * @returns {string} The title of the pull request report or the title of the pull request
   */
  getTitle() {
    const title = this.isPullRequest()
      ? `pull request #${this.pullRequestNumber()}`
      : this.getCommit({});
    return `Update dependencies for ${title}`;
  }

  /**
   * Get the branch name
   */
  getBranch(sha: string) {
    return `dependencies-update-${sha}`;
  }

  /**
   *
   * @returns {Promise<Update[]>} Whether there exists a pull request for this commit
   */
  private async checkPullRequestExists(
    sha: string
  ): Promise<{ exist: boolean; pullRequestNumber?: number }> {
    const title = this.getTitle();
    const client = github.getOctokit(this.githubToken);
    const query = `type:pr is:open repo:${github.context.repo.owner}/${github.context.repo.repo} ${title} in:title`;
    const result = await client.rest.search.issuesAndPullRequests({ q: query });
    if (result.data.total_count > 0) {
      return { exist: true, pullRequestNumber: result.data.items[0].number };
    }
    return { exist: false };
  }

  /**
   * Switch to the pull request branch. Will try to create one if it doesn't exist.
   * @returns
   */
  async switchToBranch() {
    const localBranch = this.getBranch(this.getCommit({}));
    const git = simpleGit();
    // fetch all remote branch
    await git.fetch();
    const branchResult = await git.branch();
    const remoteBranchName = `remotes/origin/${localBranch}`;
    if (branchResult.all.includes(remoteBranchName)) {
      // checkout remote branch
      await git.checkoutBranch(localBranch, remoteBranchName);
    } else {
      // checkout local branch
      await git.checkoutLocalBranch(localBranch);
    }
    return localBranch;
  }

  /**
   * Add all files and then commit
   */
  async addAndCommit() {
    const git = simpleGit();
    // set git user
    await git.addConfig("user.name", "dependencies-outdater");
    await git.addConfig("user.email", "dependencies-outater");

    await git.add("./*");
    await git.commit(`fix: ${this.getTitle()}`);
    await git.push("origin", this.getBranch(this.getCommit({})), {});
  }

  /**
   * Is this a pull request
   * @returns true if the current context is a pull request
   */
  isPullRequest() {
    return github.context.eventName === "pull_request";
  }

  /**
   * The pull request number
   * @returns the pull request number
   */
  pullRequestNumber() {
    return github.context.payload.pull_request?.number;
  }
}
