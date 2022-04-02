export interface Update {
  packageFilePath: string;
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

export interface UpdateSuggestion {
  fileName: string;
  language: string;
  content: string;
}

