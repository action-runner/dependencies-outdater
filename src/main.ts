import simpleGit from "simple-git";
import { NodeJSProvider } from "./providers/nodejs/nodejs";
import * as github from "@actions/github";
import { GithubClient } from "./providers/client/github";
import * as ncu from "npm-check-updates";
import { exec } from "child_process";

(async () => {
  const github = new GithubClient("mock_token");
  const nodejsProvider = new NodeJSProvider({
    githubClient: github,
    pkgManager: "npm",
    checkUpdater: ncu as any,
  });

  await nodejsProvider.checkUpdates({ skip: true });
})();
