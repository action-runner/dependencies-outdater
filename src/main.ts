import { NodeJSProvider } from "./providers/nodejs/nodejs";
import * as core from "@actions/core";
import { GithubClient } from "./providers/client/github";
import * as ncu from "npm-check-updates";

(async () => {
  core.debug("Starting...");
  const github = new GithubClient("mock_token");
  const nodejsProvider = new NodeJSProvider({
    githubClient: github,
    pkgManager: "npm",
    checkUpdater: ncu as any,
  });

  try {
    await nodejsProvider.checkUpdates({ skip: true });
  } catch (err) {
    core.setFailed(`${err}`);
    throw err;
  }
})();
