import { GithubClient } from "./client/github";
import * as fs from "fs";
import * as core from "@actions/core";
import { exec } from "child_process";

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

export interface ProviderProps {
  githubClient: GithubClient;
  packageFilePath?: string;
  pkgManager: string;
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

  pkgManager: string;

  constructor(props: ProviderProps) {
    this.github = props.githubClient;
    this.packageFilePath = props.packageFilePath ?? this.packageFilePath;
    this.pkgManager = props.pkgManager;
    if (!fs.existsSync(this.packageFilePath)) {
      core.setFailed(`Package file not found at ${this.packageFilePath}`);
    }
  }

  /**
   * Check list of packages and update
   */
  public async checkUpdates() {
    core.startGroup("Checking dependencies");
    const updates = await this.findUpdates();
    this.packages = updates;
    if (this.packages.length > 0) {
      await this.update();
    }
    core.endGroup();
    return updates;
  }

  /**
   * Get the report of list of packages to update
   *
   * @returns {string} Report in markdown format
   */
  protected getComment(): string {
    let output = `## ${this.github.getTitle(this.github.getCommit({}))} \n\n`;
    for (const pkg of this.packages) {
      output += `- ${pkg.name} ${pkg.currentVersion} -> ${pkg.newVersion}\n`;
    }
    return output;
  }

  /**
   * Perform the update
   */
  async update() {
    core.startGroup("Updating dependencies");
    core.info("Switching to new branch...");
    if (!this.github.isPullRequest()) {
      const branch = await this.github.switchToBranch();
      core.info(`Switched to branch ${branch}`);
    }
    core.info("Performing updating...");
    await this.performUpdate();
    if (!this.github.isPullRequest()) {
      core.info(`Adding commit...`);
      await this.github.addAndCommit();
    }
    core.info("Creating pull request...");
    const body = this.getComment();
    const headCommit = this.github.getCommit({});
    await this.github.createPullRequest(headCommit, { body: body });
    core.info("Done!");
    core.endGroup();
  }

  protected abstract performUpdate(): Promise<void>;

  /**
   * Given a package's dependencies' file, returns dependencies which need to be updated
   * @returns an array of dependencies which need to be updated
   */
  protected abstract findUpdates(): Promise<Update[]>;

  protected runCommand(command: string) {
    return new Promise((resolve, reject) => {
      exec(command, (error) => {
        if (error) {
          core.setFailed(`${error?.message}`);
          reject();
        }

        resolve("success");
      });
    });
  }
}
