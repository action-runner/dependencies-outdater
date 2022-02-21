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

## Pull request mode

On each pull request, this action will check yoour package.json file for updates. If any, it will create
a comment on your pull reequest indicates the updates it found. Whenever you update your package json to the latest version,
it will delete that comment.

<img width="969" alt="截屏2022-02-21 下午6 19 57" src="https://user-images.githubusercontent.com/32106111/154935872-9a95b1bd-9220-4b45-8ef8-ceb83f7540f7.png">

## Schedule mode

On each schedule mode, it will create a pull request whenever it found any update.
