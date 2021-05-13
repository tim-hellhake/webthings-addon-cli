[![Build Status](https://github.com/tim-hellhake/webthings-addon-cli/workflows/Build/badge.svg)](https://github.com/tim-hellhake/webthings-addon-cli/actions?query=workflow%3ABuild)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![license](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)

# WebThings addon CLI

This CLI helps you to prepare a new release of your addon and publish it by adding it to the [addon-list](https://github.com/WebThingsIO/addon-list) repo.

# Usage

```bash
npx webthings-addon-cli <command>
```

## Commands

### Config

The addon works without any configuration.

If you need to override some defaults, you can use this command.

| Setting    |                             Purpose                             |
| ---------- | :-------------------------------------------------------------: |
| githubUser | The GitHub user under which you have forked the addon-list repo |
| userName   |               The git `user.name` for new commits               |
| userEmail  |              The git `user.email` for new commits               |

The config is saved under `~/.webthings-addon-cli/config.json`.

### Prepare update <`patch`, `minor`, `major`> (<postfix>)

This command creates a new tagged release commit using the following steps:

1. Patch the versions in the `manifest.json`, `package.json` (node addons only), and `package-lock.json` (node addons only) files. The version will be increased according to the semantic versioning level you passed in as an argument.
2. Collect all commit messages since the last tag.
3. Create a new release commit with the collected commit messages.
4. Tag the release commit with the new version.

After you executed the command, you need to push the new release with `git push --tags`.

### Release update

After the CI pipeline built the new packages, you can use this command to prepare a PR in the [addon-list](https://github.com/WebThingsIO/addon-list) repo.

The command does the following steps for you:

1. Fetch the checksum files for the new release from your GitHub repo.
2. Create an updated addons file
3. Clone the [addon-list](https://github.com/WebThingsIO/addon-list) repo
4. Create a new update branch with the new addons file
5. Push the new branch to your fork of the [addon-list](https://github.com/WebThingsIO/addon-list) repo

All you need to do now is to create a new PR based on the pushed branch.
