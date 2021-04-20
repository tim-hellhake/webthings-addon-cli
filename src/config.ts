/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import { promises, constants } from 'fs';
import mkdirp from 'mkdirp';
import { createInterface, Interface } from 'readline';
import { dirname, join } from 'path';
import { homedir } from 'os';

const { access, readFile, writeFile } = promises;

export interface Config {
  githubUser?: string;
  userName?: string;
  userEmail?: string;
}

const CONFIG_FILE_LOCATION = join(homedir(), '.webthings-addon-cli', 'config.json');

export async function load(): Promise<Config> {
  try {
    await access(CONFIG_FILE_LOCATION, constants.F_OK);
    const config = await readFile(CONFIG_FILE_LOCATION);
    return JSON.parse(config.toString());
  } catch (err) {
    return {};
  }
}

export async function create(): Promise<Config> {
  const { githubUser, userName, userEmail } = await load();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const newGithubUser = await question(
    rl,
    `What is your github username (used to locate your addon-list fork)?[${githubUser}] `
  );
  const newUserName = await question(
    rl,
    `What is your full name (used for git commits)?[${userName}] `
  );
  const newUserEmail = await question(
    rl,
    `What is your email (used for git commits)?[${userEmail}] `
  );
  rl.close();

  const config: Config = {
    githubUser: newGithubUser || githubUser,
    userName: newUserName || userName,
    userEmail: newUserEmail || userEmail,
  };

  try {
    await save(config);
  } catch (e) {
    console.warn(`Could not save config ${e}`);
  }

  return config;
}

function question(readline: Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    readline.question(query, resolve);
  });
}

export async function save(config: Config): Promise<void> {
  await mkdirp(dirname(CONFIG_FILE_LOCATION));
  await writeFile(CONFIG_FILE_LOCATION, JSON.stringify(config, null, 2));
}
