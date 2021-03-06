import { Update, UpdateSuggestion } from "../types/update";
import { NodeJSProvider } from "./nodejs";
import glob from "glob";
import { PackageFile } from "../types/nodejs";
import fs from "fs";

/**
 * Check packages under nodejs workspace
 */
export class NodeJSWorkspaceProvider extends NodeJSProvider {
  public name: string = "nodejs-workspace";
  // List of package file paths where updates are available
  protected updatedPackageFilePaths: string[] = [];

  protected async performUpdate(
    shouldApply: boolean
  ): Promise<UpdateSuggestion[]> {
    const packageFiles: { [key: string]: PackageFile } = {};
    for (const pkg of this.updatedPackageFilePaths) {
      packageFiles[pkg] = this.getPackageFile(pkg);
    }

    for (const pkg of this.packages) {
      // get package file based on package filepath
      const pkgFile = packageFiles[pkg.packageFilePath];
      const dep = pkgFile.dependencies
        ? pkgFile.dependencies[pkg.name]
        : undefined;
      const devDep = pkgFile.devDependencies
        ? pkgFile.devDependencies[pkg.name]
        : undefined;
      if (dep) {
        pkgFile.dependencies![pkg.name] = pkg.newVersion;
      }

      if (devDep) {
        pkgFile.devDependencies![pkg.name] = pkg.newVersion;
      }
    }
    // write package files
    if (shouldApply) {
      for (const pkg of this.updatedPackageFilePaths) {
        const pkgFile = packageFiles[pkg];
        fs.writeFileSync(pkg, JSON.stringify(pkgFile, null, 2));
      }
    }

    // update updateSuggestions
    const updateSuggestions = Object.entries(packageFiles).map(
      ([filePath, pkgFile]) => {
        return {
          fileName: filePath,
          language: "json",
          content: JSON.stringify(pkgFile, null, 2),
        };
      }
    );
    this.updateSuggestions = updateSuggestions;
    return updateSuggestions;
  }

  protected async findUpdates(): Promise<Update[]> {
    const packageFile = this.getPackageFile();
    this.updatedPackageFilePaths = [];
    // find package files
    let packages: string[] = [];
    if (packageFile.workspaces) {
      for (const workspace of packageFile.workspaces) {
        packages = packages.concat(this.findPackageJsonFile(workspace));
      }
    }

    // find updates
    let updates: Update[] = [];
    for (const pkg of packages) {
      const pkgFile = this.getPackageFile(pkg);
      const foundUpdates = await this.findUpdatesHelper(pkgFile, pkg);
      if (foundUpdates.length > 0) {
        updates = updates.concat(foundUpdates);
        this.updatedPackageFilePaths.push(pkg);
      }
    }
    return updates;
  }

  /**
   * Find all package.json files under the workspace
   * @param workspace Workspace path
   */
  protected findPackageJsonFile(workspace: string): string[] {
    // we don't want to include any package files within the node_modules folder
    return glob
      .sync(`${workspace}/**/package.json`)
      .filter((f) => !f.includes("node_modules"));
  }
}
