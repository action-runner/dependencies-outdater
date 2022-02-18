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
    props: { base?: string; body: string; deleteComment: boolean }
  ): Promise<any | undefined> {
    const client = github.getOctokit(this.githubToken);
    // add a comment to the pull request instead of creating a new one
    if (this.isPullRequest()) {
      // Get the pull request number
      const pullRequestNumber = github.context.payload.pull_request?.number;
      if (pullRequestNumber) {
        core.info(`Adding comment to pull request ${pullRequestNumber}`);
        // Add a comment to the pull request
        await this.createComment(
          pullRequestNumber,
          props.body,
          props.deleteComment
        );
        return;
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
      title: this.getTitle(),
      head: `dependencies-update-${sha}`,
      base: props.base ?? github.context.ref,
      body: props.body,
    });

    return result;
  }

  private async findComment(pullRequestNumber: number) {
    const client = github.getOctokit(this.githubToken);
    for await (const { data: comments } of client.paginate.iterator(
      client.rest.issues.listComments,
      {
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: pullRequestNumber,
      }
    )) {
      // Search each page for the comment
      const comment = comments.find((comment) =>
        comment.body?.includes(this.getTitle())
      );
      if (comment) return comment;
    }
    return undefined;
  }

  private async createComment(
    pullRequestNumber: number,
    content: string,
    deleteComment = false
  ) {
    const client = github.getOctokit(this.githubToken);
    // search for the pull request's comment while content contains the string "Update dependencies"
    // and the comment is not from the github-actions bot
    // and the comment is from this pull request
    core.info(`Creating pull request with comment`);
    const result = await this.findComment(pullRequestNumber);
    if (result !== undefined) {
      core.info(`Found comment ${result.id}`);
      // update the comment
      if (deleteComment) {
        core.info(`Deleting comment ${result.id}`);
        await client.rest.issues.deleteComment({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          comment_id: result.id,
        });
        return;
      }
      core.info(`Updating comment ${result.id}`);
      await client.rest.issues.updateComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        comment_id: result.id,
        body: content,
      });
    } else {
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

  getTitle() {
    const title = this.isPullRequest()
      ? `pull request #${this.pullRequestNumber()}`
      : this.getCommit({});
    return `Update dependencies for ${title}`;
  }

  private getBranch(sha: string) {
    return `dependencies-update-${sha}`;
  }

  /**
   *
   * @returns {Promise<Update[]>} Whether there exists a pull request for this commit
   */
  private async checkPullRequestExists(sha: string): Promise<boolean> {
    const title = this.getTitle();
    const client = github.getOctokit(this.githubToken);
    const result = await client.rest.search.issuesAndPullRequests({ q: title });
    if (result.data.total_count > 0) {
      return true;
    }
    return false;
  }

  async switchToBranch() {
    const branch = this.getBranch(this.getCommit({}));
    const git = simpleGit();
    try {
      await git.checkout(["-b", branch]);
    } catch (e) {
      await git.checkout(branch);
    }
    return branch;
  }

  async addAndCommit() {
    const git = simpleGit();
    // set git user
    await git.addConfig("user.name", "dependencies-outdater");
    await git.addConfig("user.email", "dependencies-outater");

    await git.add("./*");
    await git.commit("Depedencies_outdater: Update dependencies");
    await git.push("origin", this.getBranch(this.getCommit({})), {});
  }

  isPullRequest() {
    return github.context.eventName === "pull_request";
  }

  pullRequestNumber() {
    return github.context.payload.pull_request?.number;
  }
}
