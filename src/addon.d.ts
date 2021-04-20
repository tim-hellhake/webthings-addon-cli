/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

export interface Addon {
  id: string;
  name: string;
  description: string;
  author: string;
  homepage_url: string;
  license_url: string;
  primary_type: string;
  packages: Package[];
}

export interface Package {
  architecture: string;
  language: Language;
  version: string;
  url: string;
  checksum: string;
  gateway: Gateway;
}

export interface Language {
  name: string;
  versions: string[];
}

export interface Gateway {
  min: string;
  max: string;
}
