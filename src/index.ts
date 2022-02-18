import { GithubClient } from "./providers/client/github";
import { Language } from "./providers/languages";
import * as core from "@actions/core";
import * as ncu from "npm-check-updates";
import { NodeJSProvider } from "./providers/nodejs/nodejs";

(async () => {
  const accessToken = core.getInput("access_token");
  const gitClient = new GithubClient(accessToken);
  const map = {
    [Language.nodeJs]: new NodeJSProvider({
      githubClient: gitClient,
      pkgManager: "yarn",
      checkUpdater: ncu as any,
    }),
  };

  const language = Language.nodeJs;
  const provider = map[language];

  await provider.checkUpdates({ skip: false });
})();
