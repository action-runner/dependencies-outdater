import simpleGit from "simple-git";
import { NodeJSProvider } from "./providers/nodejs/nodejs";
import * as github from "@actions/github";
import { GithubClient } from "./providers/client/github";
import { exec } from "child_process";

(async () => {
  const run = () => {
    return new Promise((resolve, reject) => {
      exec("ping www.google.com", (error, stdout, stderr) => {
        if (error) {
          reject();
          return;
        }

        resolve("success");
      });
    });
  };

  const result = await run();
  console.log(result);
})();
