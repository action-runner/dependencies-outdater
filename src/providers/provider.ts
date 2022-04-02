import * as core from "@actions/core";
import { exec } from "child_process";
import * as fs from "fs";
import { GithubClient } from "./client/github";
import { Update, UpdateSuggestion } from "./types/update";

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

  updateSuggestions: UpdateSuggestion[] = [];

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
  public async checkUpdates(props: { skip: boolean }) {
    core.startGroup("Checking dependencies");
    const updates = await this.findUpdates();
    this.packages = updates;
    await this.update();
    core.endGroup();
    return updates;
  }

  /**
   * Get the report of list of packages to update
   *
   * @returns {string} Report in markdown format
   */
  getComment(): string {
    let output = `## ${this.github.getTitle()}\n\n`;
    // markdown table header
    output += `| Package | Package Path | Current Version | New Version|\n`;
    output += `|:-------:|:------------:|:--------------:|:---------:|\n`;
    for (const pkg of this.packages) {
      // use markdown table
      output += `| ${pkg.name} | ${pkg.packageFilePath} | ${pkg.currentVersion} | ${pkg.newVersion} |\n`;
    }

    core.info("Creating Suggestions: " + this.updateSuggestions.length);
    if (this.updateSuggestions.length > 0) {
      output += `\n`;
      output += `### Suggested updates\n`;
    }

    for (const suggestion of this.updateSuggestions) {
      output += `**${suggestion.fileName}** \n`;
      output += `\`\`\`${suggestion.language}\n`;
      output += `${suggestion.content}\n`;
      output += `\`\`\`\n`;
    }

    return output;
  }

  /**
   * Perform the update
   */
  private async update() {
    // if any update available
    if (this.packages.length > 0) {
      core.startGroup("Updating dependencies");
      core.info("Switching to new branch...");
      if (!this.github.isPullRequest()) {
        const branch = await this.github.switchToBranch();
        core.info(`Switched to branch ${branch}`);
        core.info("Performing updating...");
        await this.performUpdate(true);
        core.info(`Adding commit...`);
        await this.github.addAndCommit();
      } else {
        await this.performUpdate(false);
      }
    }
    core.info("Creating pull request...");
    const body = this.getComment();
    const headCommit = this.github.getCommit({});
    await this.github.createPullRequest(headCommit, {
      body: body,
      deleteComment: this.packages.length === 0,
      packages: this.packages,
    });
    core.info("Done!");
    core.endGroup();
  }

  protected abstract performUpdate(shouldApply: boolean): Promise<void>;

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
