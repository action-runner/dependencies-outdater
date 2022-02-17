import { GithubClient } from "./client/github";
import * as fs from "fs";
import * as core from "@actions/core";

export interface Update {
  /**
   * Package name
   */
  name: string;
  /**
   * Package's new version
   */
  newVersion: string;

  /**
   * Package's current version
   */
  currentVersion: string;
}

export abstract class Provider {
  /**
   * Provider's name
   */
  public abstract name: string;

  /**
   * Default package file path
   */
  packageFilePath: string = "package.json";

  /**
   * List of packages to update
   */
  protected packages: Update[] = [];

  /**
   * Github client
   */
  protected github!: GithubClient;

  constructor(props: { githubClient: GithubClient; packageFilePath?: string }) {
    this.github = props.githubClient;
    this.packageFilePath = props.packageFilePath ?? this.packageFilePath;
    if (!fs.existsSync(this.packageFilePath)) {
      core.setFailed(`Package file not found at ${this.packageFilePath}`);
    }
  }

  /**
   * Check list of packages and update
   */
  public async checkUpdates() {
    const updates = await this.findUpdates();
    this.packages = updates;
    await this.update();
    const body = this.getComment();
    const headCommit = this.github.getCommit({});
    await this.github.createPullRequest(headCommit, { body: body });
  }

  /**
   * Get the report of list of packages to update
   *
   * @returns {string} Report in markdown format
   */
  protected getComment(): string {
    let output = `## Dependencies to update for commit \n\n`;
    for (const pkg of this.packages) {
      output += `- ${pkg.name} ${pkg.currentVersion} -> ${pkg.newVersion}\n`;
    }
    return output;
  }

  async update(){

  }

  protected abstract performUpdate(): Promise<void>;

  /**
   * Given a package's dependencies' file, returns dependencies which need to be updated
   * @returns an array of dependencies which need to be updated
   */
  protected abstract findUpdates(): Promise<Update[]>;
}
