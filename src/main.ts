import simpleGit from "simple-git";

(async () => {
  const git = simpleGit();
  await git.add("./*");
  await git.commit("Update dependencies");
  await git.push("origin", "random");
})();
