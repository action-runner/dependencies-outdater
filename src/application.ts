import { GithubClient } from "./providers/client/github";
import { Language } from "./providers/languages";
import * as core from "@actions/core";
import * as ncu from "npm-check-updates";
import { NodeJSProvider } from "./providers/nodejs/nodejs";
import { NodeJSWorkspaceProvider } from "./providers/nodejs/nodejs_workspace";
import { Update, UpdateSuggestion } from "./providers/types/update";
import { Provider } from "./providers/provider";

export async function application() {
  const accessToken = core.getInput("access_token");
  const language = core.getInput("language") as Language;

  const gitClient = new GithubClient(accessToken);
  const map = {
    [Language.nodeJs]: [
      new NodeJSProvider({
        githubClient: gitClient,
        pkgManager: "yarn",
        checkUpdater: ncu as any,
      }),
      new NodeJSWorkspaceProvider({
        githubClient: gitClient,
        pkgManager: "yarn",
        checkUpdater: ncu as any,
      }),
    ],
  };

  const providers = map[language];

  if (providers === undefined) {
    core.setFailed("Language is not supported");
    return;
  }

  let index = 0;
  let totalPackages: Update[] = [];
  let totalUpdateSuggestions: UpdateSuggestion[] = [];
  for (const provider of providers) {
    core.info(`Using provider ${provider.name}`);
    const { updateSuggestions, updates } = await provider.checkUpdates({
      skip: false,
    });
    totalPackages = totalPackages.concat(updates);
    totalUpdateSuggestions = totalUpdateSuggestions.concat(updateSuggestions);
    index += 1;
  }

  // create a comment
  const comment = Provider.getComment({
    title: gitClient.getTitle(),
    packages: totalPackages,
    updateSuggestions: totalUpdateSuggestions,
  });

  if (!gitClient.isPullRequest()) {
    // try to create an update
    const branch = await gitClient.switchToBranch();
    core.info(`Switching to ${branch}`);
    await gitClient.addAndCommit();
  }

  const headCommit = gitClient.getCommit({});

  // create a pull request
  await gitClient.createPullRequest(headCommit, {
    body: comment,
    deleteComment: totalPackages.length === 0,
    packages: totalPackages,
  });

  return { totalPackages, totalUpdateSuggestions };
}
