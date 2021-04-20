/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import { Config, create } from '../config';
import { Command } from './command';

export class ConfigCommand implements Command {
  getName(): string {
    return 'config';
  }

  getArguments(): string {
    return '';
  }

  async execute(_config: Config, _args: string[]): Promise<void> {
    await create();
  }
}
