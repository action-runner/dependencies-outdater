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
    const updateSuggestions = await this.update();
    core.endGroup();
    return { updates, updateSuggestions };
  }

  /**
   * Get the report of list of packages to update
   *
   * @returns {string} Report in markdown format
   */
  static getComment(props: {
    title: string;
    packages: Update[];
    updateSuggestions: UpdateSuggestion[];
    sha: string;
  }): string {
    let output = `## ${props.title}\n\n`;
    output += `For commit [${props.sha}]\n\n`;
    
    // markdown table header
    output += `| Package | Package Path | Current Version | New Version|\n`;
    output += `|:-------:|:------------:|:--------------:|:---------:|\n`;
    for (const pkg of props.packages) {
      // use markdown table
      output += `| ${pkg.name} | ${pkg.packageFilePath} | ${pkg.currentVersion} | ${pkg.newVersion} |\n`;
    }

    core.info("Creating Suggestions: " + props.updateSuggestions.length);
    if (props.updateSuggestions.length > 0) {
      output += `\n`;
      output += `### Suggested updates\n`;
    }

    for (const suggestion of props.updateSuggestions) {
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
    let updateSuggestions: UpdateSuggestion[] = [];
    if (this.packages.length > 0) {
      core.startGroup("Updating dependencies");
      if (!this.github.isPullRequest()) {
        updateSuggestions = await this.performUpdate(true);
      } else {
        updateSuggestions = await this.performUpdate(false);
      }
    }
    core.info("Done!");
    core.endGroup();

    return updateSuggestions;
  }

  protected abstract performUpdate(
    shouldApply: boolean
  ): Promise<UpdateSuggestion[]>;

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
