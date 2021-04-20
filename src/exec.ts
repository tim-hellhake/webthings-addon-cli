/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import { spawn, SpawnOptionsWithoutStdio } from 'child_process';

export async function exec(
  file: string,
  args: string[],
  pipeOutput = false,
  options?: SpawnOptionsWithoutStdio
): Promise<string> {
  return new Promise(function (resolve, reject) {
    console.log(`> ${file} ${args.reduce((cur, prev) => `${cur} ${prev}`)}`);
    const p = spawn(file, args, options);

    let stdOut = '';
    let stdErr = '';

    p.stdout.on('data', (data) => {
      stdOut += data;

      if (pipeOutput) {
        console.log(data.toString());
      }
    });

    p.stderr.on('data', (data) => {
      stdErr += data;

      if (pipeOutput) {
        console.error(data.toString());
      }
    });

    p.on('close', (code) => {
      if (code == 0) {
        resolve(stdOut);
      } else {
        reject(stdErr);
      }
    });
  });
}
