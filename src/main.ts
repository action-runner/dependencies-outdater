import { NodeJSProvider } from "./providers/nodejs/nodejs";
import { GithubClient } from "./providers/client/github";
import * as ncu from "npm-check-updates";
import SimpleGit from "simple-git";

(async () => {
  const git = SimpleGit();
  console.log(await git.branch());
})();
