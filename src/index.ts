/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import { ConfigCommand } from './commands/config';
import { PrepareUpdateCommand } from './commands/prepare-update';
import { ReleaseUpdateCommand } from './commands/release-update';
import { load } from './config';
import { Command } from './commands/command';

const args = process.argv.slice(2);

const commands = [new ConfigCommand(), new PrepareUpdateCommand(), new ReleaseUpdateCommand()];

if (args.length < 1) {
  // eslint-disable-next-line max-len
  console.log('Usage:');

  for (const command of commands) {
    console.log(` * webthings-addon-cli ${command.getName()} ${command.getArguments()}`);
  }

  process.exit(1);
}

main(args);

async function main(args: string[]): Promise<void> {
  const config = await load();
  const [cmd] = args;
  const command = getCommand(cmd);

  try {
    await command.execute(config, args.slice(1));
  } catch (e) {
    const err: Error = e;
    console.error(err.message);
  }
}

function getCommand(cmd: string): Command {
  for (const command of commands) {
    if (cmd == command.getName()) {
      return command;
    }
  }

  throw new Error(`Unknown command ${cmd}`);
}
