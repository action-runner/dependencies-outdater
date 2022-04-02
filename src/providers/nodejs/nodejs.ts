import * as core from "@actions/core";
import fs from "fs";
import { Provider, ProviderProps } from "../provider";
import { PackageFile, Updater } from "../types/nodejs";
import { Update } from "../types/update";

interface NodeJSProps extends ProviderProps {
  checkUpdater: Updater;
}

export class NodeJSProvider extends Provider {
  public name: string = "nodejs";
  protected updater: Updater;

  constructor(props: NodeJSProps) {
    super(props);
    this.updater = props.checkUpdater;
  }

  protected async performUpdate(shouldApply: boolean): Promise<void> {
    const packageFile = this.getPackageFile();
    for (const pkg of this.packages) {
      const dep = packageFile?.dependencies ? [pkg.name] : undefined;
      const devDep = packageFile?.devDependencies ? [pkg.name] : undefined;
      if (dep) {
        packageFile.dependencies![pkg.name] = pkg.newVersion;
      }

      if (devDep) {
        packageFile.devDependencies![pkg.name] = pkg.newVersion;
      }
    }
    fs.writeFileSync(
      this.packageFilePath,
      JSON.stringify(packageFile, null, 2)
    );

    if (shouldApply) {
      if (this.pkgManager === "yarn") {
        core.info("Running yarn install");
        this.runCommand("yarn install");
      }

      if (this.pkgManager === "npm") {
        core.info("Running npm install");
        this.runCommand("npm install");
      }
    }

    // update updateSuggestions
    this.updateSuggestions = [
      {
        fileName: this.packageFilePath,
        language: "json",
        content: JSON.stringify(packageFile, null, 2),
      },
    ];
  }

  protected async findUpdates(): Promise<Update[]> {
    const packageFile = this.getPackageFile();
    const updates = this.findUpdatesHelper(packageFile, this.packageFilePath);
    return updates as any;
  }

  protected async findUpdatesHelper(
    packageFile: PackageFile,
    packageFilePath: string
  ): Promise<Update[]> {
    const upgraded = await this.updater.run({
      packageFile: packageFilePath,
    });
    core.info(
      `Found ${Object.keys(upgraded).length} updates in ${packageFilePath}`
    );
    const updates: Update[] = Object.entries(upgraded).map(
      ([name, version]) => ({
        name,
        packageFilePath: packageFilePath,
        newVersion: version,
        currentVersion: this.getCurrentVersion(packageFile, name),
      })
    );

    return updates;
  }

  protected getCurrentVersion(packageFile: PackageFile, name: string) {
    if (packageFile.dependencies) {
      if (packageFile.dependencies[name]) {
        return packageFile.dependencies[name];
      }
    }

    if (packageFile.devDependencies) {
      return packageFile.devDependencies[name];
    }
    return "";
  }

  /**
   * Return the package.json file. Will returned the package file defined in the parameter
   * @returns Package file
   */
  protected getPackageFile(packageFilePath?: string): PackageFile {
    const packageFile: PackageFile = JSON.parse(
      fs.readFileSync(packageFilePath ?? this.packageFilePath, "utf8")
    );
    return packageFile;
  }
}
