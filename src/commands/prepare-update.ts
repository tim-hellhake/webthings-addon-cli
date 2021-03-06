/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import { existsSync, readFileSync, writeFileSync, promises, constants } from 'fs';
import { parse } from 'semver';
import { Config } from '../config';
import { exec } from '../exec';
import { Manifest } from '../manifest';
import { Command } from './command';

const { access } = promises;

interface Package {
  version: string;
}

export class PrepareUpdateCommand implements Command {
  getName(): string {
    return 'prepare-update';
  }

  getArguments(): string {
    return '<patch | minor | major> (<postfix>)';
  }

  async execute(_config: Config, args: string[]): Promise<void> {
    if (args.length < 1) {
      // eslint-disable-next-line max-len
      throw new Error(
        'Usage: webthings-addon-cli prepare-update <patch | minor | major> (<postfix>)'
      );
    }

    let currentVersion;
    const manifest = getObjectOrNothing<Manifest>('./manifest.json');

    if (manifest) {
      const { version } = manifest;
      currentVersion = version;
    } else {
      console.log(`No manifest.json found, falling back to package.json`);
      const { version } = getObject<Package>('./package.json');
      currentVersion = version;
    }

    const semVer = parse(currentVersion);

    if (!semVer) {
      throw new Error(`Could parse version ${currentVersion}`);
    }

    const [level, postFix] = args;
    const files: string[] = [];

    for (const file of ['package.json', 'package-lock.json', 'manifest.json']) {
      try {
        await access(file, constants.F_OK);
        files.push(file);
        console.log(`Found ${file}`);
      } catch {
        // package.json and package-lock.json are only present in node projects
      }
    }

    console.log();

    switch (level) {
      case 'patch':
      case 'minor':
      case 'major': {
        const newVersion = semVer.inc(level).format() + (postFix ?? '');

        for (const file of files) {
          patchVersion(file, newVersion);
        }

        let message = `Release ${newVersion}`;

        const log = await getHistory();

        if (log) {
          message += `\n\n${log}`;
        }

        await exec('git', ['add', ...files], true);
        await exec('git', ['commit', '-m', message], true);
        await exec('git', ['tag', newVersion], true);
        break;
      }
      default:
        throw new Error(`Unknown update level ${level}`);
    }
  }
}

export function getObject<T>(path: string): T {
  const object = getObjectOrNothing<T>(path);

  if (!object) {
    throw new Error(`Could not find file ${path}`);
  }

  return object;
}

export function getObjectOrNothing<T>(path: string): T | undefined {
  let object;

  if (existsSync(path)) {
    const content = readFileSync(path).toString();
    object = JSON.parse(content);
  }

  return object;
}

function patchVersion(path: string, version: string): void {
  if (!existsSync(path)) {
    throw new Error(`Could not find file ${path}`);
  }

  const content = readFileSync(path).toString();
  const object = JSON.parse(content);
  object.version = version;
  const json = JSON.stringify(object, null, 2);
  writeFileSync(path, `${json}\n`);
}

async function getHistory(): Promise<string> {
  const tagsString = await exec('git', ['tag', '--sort=creatordate'], true);
  const tags = tagsString.trim().split('\n');

  let range = '';

  if (tags.length > 0) {
    const latest = tags[tags.length - 1];
    range = `${latest}..HEAD`;
  }

  // eslint-disable-next-line max-len
  const log = await exec(
    'git',
    ['log', '--pretty=format:%s', '--reverse', '--no-merges', range],
    true
  );

  return log;
}
