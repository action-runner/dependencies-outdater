import simpleGit from "simple-git";

(async () => {
  const git = simpleGit();
  await git.checkout("test");
  await git.add("./*");
  await git.commit("Update dependencies");
  await git.push(["-u", "origin", "test"]);
})();
