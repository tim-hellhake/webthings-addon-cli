/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import { dirSync } from 'tmp';
import { getObject } from './prepare-update';
import { join } from 'path';
import { exec } from '../exec';
import { existsSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';
import { Release } from '../github';
import { Manifest } from '../manifest';
import { Addon, Package } from '../addon';
import { Config } from '../config';
import { Command } from './command';

export class ReleaseUpdateCommand implements Command {
  getName(): string {
    return 'release-update';
  }

  getArguments(): string {
    return '';
  }

  async execute(config: Config, _args: string[]): Promise<void> {
    const manifest = (getObject('./manifest.json') as unknown) as Manifest;

    // eslint-disable-next-line max-len
    const origin = await exec('git', ['config', '--get', 'remote.origin.url'], true);
    const { user, repo } = getUsernameFromRemoteUrl(origin.trim());

    const addon = await createAddon(user, repo, manifest);

    await createUpdateBranch(config, user, manifest, addon);
  }
}

function getUsernameFromRemoteUrl(remote: string): { user: string; repo: string } {
  const gitClonePrefix = 'git@github.com:';
  const httpsClonePrefix = 'https://github.com/';

  if (remote.indexOf(gitClonePrefix) != -1) {
    const rest = remote.replace(gitClonePrefix, '').replace('.git', '');
    const [user, repo] = rest.split('/');

    if (!user || !repo) {
      throw new Error(`Invalid GitHub clone url origin: ${remote}`);
    }

    return { user, repo };
  } else if (remote.indexOf(httpsClonePrefix) != -1) {
    const rest = remote.replace(httpsClonePrefix, '').replace('.git', '');
    const [user, repo] = rest.split('/');

    if (!user || !repo) {
      throw new Error(`Invalid GitHub clone url origin: ${remote}`);
    }

    return { user, repo };
  } else {
    throw new Error(`Expected GitHub clone url origin but found ${remote}`);
  }
}

async function createAddon(user: string, repo: string, manifest: Manifest): Promise<Addon> {
  const {
    id,
    name,
    version,
    description,
    author,
    homepage_url,
    gateway_specific_settings,
  } = manifest;

  const { webthings } = gateway_specific_settings;

  const { primary_type } = webthings;

  const response = await fetch(`https://api.github.com/repos/${user}/${repo}/releases`);
  const releases: Release[] = await response.json();

  if (releases.length == 0) {
    throw new Error(`${user}/${repo} has no releases`);
  }

  const [lastestRelease] = releases;

  const { assets } = lastestRelease;

  const packageAssets = assets.filter((asset) => !asset.name.endsWith('sha256sum'));

  const packages: Package[] = [];

  for (const asset of packageAssets) {
    const { browser_download_url } = asset;
    const pkg = await createPackage(browser_download_url, version, manifest);
    packages.push(pkg);
  }

  switch (packages[0].language.name) {
    case 'nodejs': {
      packages.sort((p1, p2) => {
        const levels = Object.values(NODE_VERSIONS);
        const p1v = levels.indexOf(parseInt(p1.language.versions[0]));
        const p2v = levels.indexOf(parseInt(p2.language.versions[0]));
        const p1a = ARCHITECTURES.indexOf(p1.architecture);
        const p2a = ARCHITECTURES.indexOf(p2.architecture);

        return p1v - p2v || p1a - p2a;
      });
      break;
    }
    case 'python': {
      packages.sort((p1, p2) => {
        const versions = Object.values(PYTHON_VERSIONS);
        const p1v = versions.indexOf(p1.language.versions[0]);
        const p2v = versions.indexOf(p2.language.versions[0]);
        const p1a = ARCHITECTURES.indexOf(p1.architecture);
        const p2a = ARCHITECTURES.indexOf(p2.architecture);

        return p1v - p2v || p1a - p2a;
      });
      break;
    }
  }

  return {
    id,
    name,
    description,
    author,
    homepage_url,
    license_url: `https://raw.githubusercontent.com/${user}/${repo}/master/LICENSE`,
    primary_type,
    packages,
  };
}

const ARCHITECTURES = ['linux-arm', 'linux-arm64', 'linux-x64', 'darwin-x64'];
const NODE_VERSIONS = {
  v8: 57,
  v10: 64,
  v12: 72,
  v14: 83,
};
const PYTHON_VERSIONS = ['3.5', '3.6', '3.7', '3.8', '3.9'];

async function createPackage(url: string, version: string, manifest: Manifest): Promise<Package> {
  console.log(`Creating package for ${url}`);

  const { gateway_specific_settings } = manifest;

  const { webthings } = gateway_specific_settings;

  const { exec, strict_min_version, strict_max_version } = webthings;

  let architecture = 'any';
  let language = 'any';
  let versions = ['any'];

  for (const arch of ARCHITECTURES) {
    if (url.indexOf(arch) > -1) {
      architecture = arch;
    }
  }

  if (exec.indexOf('python') > -1) {
    language = 'python';
    versions = PYTHON_VERSIONS;
  }

  if (exec.indexOf('nodeLoader') > -1) {
    language = 'nodejs';

    for (const [node, level] of Object.entries(NODE_VERSIONS)) {
      if (url.indexOf(node) > -1) {
        versions = [`${level}`];
      }
    }
  }

  const checkSumUrl = `${url}.sha256sum`;
  const checksum = await fetchChecksum(checkSumUrl);

  return {
    architecture,
    language: {
      name: language,
      versions,
    },
    version,
    url,
    checksum,
    gateway: {
      min: strict_min_version,
      max: strict_max_version ?? '*',
    },
  };
}

async function fetchChecksum(url: string): Promise<string> {
  const response = await fetch(url);

  if (response.status === 302) {
    const location = response.headers.get('location');

    if (!location) {
      throw new Error('Server returned 302 but no location header was present');
    }

    console.log(`Following redirect to ${location}`);

    return fetchChecksum(location);
  }

  const text = await response.text();

  return text.split(' ')[0];
}

async function createUpdateBranch(
  config: Config,
  repoUser: string,
  manifest: Manifest,
  addon: Addon
): Promise<void> {
  const { githubUser, userName, userEmail } = config;
  const { id } = manifest;
  const user = githubUser || repoUser;
  const repo = 'addon-list';

  const upstreamUrl = `https://github.com/WebThingsIO/${repo}.git`;

  const response = await fetch(`https://api.github.com/repos/${user}/${repo}`);

  if (response.status == 404) {
    let msg = `\nLook like you don't have a fork of the '${repo}' repo in your user '${user}'\n`;
    // eslint-disable-next-line max-len
    msg += `Please fork the repo '${upstreamUrl}' in your user '${user}' or set an explicit github user with the 'config' command`;
    throw new Error(msg);
  }

  const forkUrl = `git@github.com:${user}/${repo}.git`;

  const tmpDirResult = dirSync();
  const tmpDir = tmpDirResult.name;
  const tmpDirRepo = join(tmpDirResult.name, repo);

  await exec('git', ['clone', upstreamUrl], true, { cwd: tmpDir });
  await exec('git', ['remote', 'add', 'fork', forkUrl], true, { cwd: tmpDirRepo });

  if (userName) {
    await exec('git', ['config', 'user.name', userName], true, { cwd: tmpDirRepo });
  }

  if (userEmail) {
    await exec('git', ['config', 'user.email', userEmail], true, { cwd: tmpDirRepo });
  }

  const addonsFile = join(tmpDirRepo, 'addons', `${id}.json`);

  const version = addon.packages[0].version;
  let branch: string;
  let message: string;

  if (existsSync(addonsFile)) {
    branch = `update-${id}-to-${version}`;
    message = `Update ${id} to ${version}`;
  } else {
    branch = `add-${id}`;
    message = `Add ${id}`;
  }

  await exec('git', ['checkout', '-b', branch], true, { cwd: tmpDirRepo });

  writeFileSync(addonsFile, `${JSON.stringify(addon, null, 2)}\n`);

  await exec('git', ['status'], true, { cwd: tmpDirRepo });
  await exec('git', ['add', '.'], true, { cwd: tmpDirRepo });
  await exec('git', ['commit', '-m', message], true, { cwd: tmpDirRepo });
  await exec('git', ['push', '-f', '--set-upstream', 'fork', branch], true, { cwd: tmpDirRepo });
}
