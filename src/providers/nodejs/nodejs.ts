import * as ncu from "npm-check-updates";
import {Provider, ProviderProps, Update} from "../provider";
import fs from "fs";
import * as core from "@actions/core";

interface PackageFile {
  dependencies: { [key: string]: string };
}

interface Updater {
  run(props: {packageFile?: string}): {[key: string]: string}
}

interface NodeJSProps extends ProviderProps{
  checkUpdater:Updater
}

export class NodeJSProvider extends Provider {
  public name: string = "nodejs";
  private updater: Updater;

  constructor(props: NodeJSProps) {
    super(props);
    this.updater = props.checkUpdater
  }

  protected async performUpdate(): Promise<void> {
    const packageFile = this.getPackageFile();
    for (const pkg of this.packages) {
      packageFile.dependencies[pkg.name] = pkg.newVersion;
    }
    fs.writeFileSync(
      this.packageFilePath,
      JSON.stringify(packageFile, null, 2)
    );

    if (this.pkgManager === "yarn") {
      core.info("Running yarn install");
      this.runCommand("yarn install");
    }

    if (this.pkgManager === "npm") {
      core.info("Running npm install");
      this.runCommand("npm install");
    }
  }

  protected async findUpdates(): Promise<Update[]> {
    const packageFile = this.getPackageFile();
    const upgraded = this.updater.run({ packageFile: this.packageFilePath });
    core.info(`Found ${Object.keys(upgraded).length} updates`);
    const updates = Object.entries(upgraded).map(([name, version]) => ({
      name,
      newVersion: version,
      currentVersion: packageFile.dependencies[name],
    }));

    return updates as any;
  }

  /**
   * Return the package.json file
   * @returns Package file
   */
  private getPackageFile(): PackageFile {
    const packageFile: PackageFile = JSON.parse(
      fs.readFileSync(this.packageFilePath, "utf8")
    );
    return packageFile;
  }
}
