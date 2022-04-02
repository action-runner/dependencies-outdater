export interface PackageFile {
  workspaces?: string[];
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
}

export interface Updater {
  run(props: { packageFile?: string }): Promise<{ [key: string]: string }>;
}
