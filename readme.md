# Dependencies outdater

[![codecov](https://codecov.io/gh/action-runner/dependencies-outdater/branch/master/graph/badge.svg?token=7DG55EMBSU)](https://codecov.io/gh/action-runner/dependencies-outdater)

A Automated Dependencies checking tool to check your dependencies and will create a pull request based on that.


Sample action

```yaml
outdated:
runs-on: ubuntu-latest
name: Check Dependencies
steps:
    - uses: actions/checkout@v2
      with:
        fetch-depth: 0
    - name: Use Node.js 16
      uses: actions/setup-node@v2
      with:
        node-version: 16
        cache: 'yarn'
    - run: yarn
    - run: yarn build
    - name: check dependencies
      uses: action-runner/depedencies_outdater
      with:
        access_token: ${{ secrets.GITHUB_TOKEN }}
```
