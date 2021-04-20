/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

export interface Manifest {
  manifest_version: number;
  id: string;
  name: string;
  short_name: string;
  version: string;
  description: string;
  homepage_url: string;
  license: string;
  author: string;
  gateway_specific_settings: GatewaySpecificSettings;
  options: Options;
}

export interface GatewaySpecificSettings {
  webthings: Webthings;
}

export interface Webthings {
  exec: string;
  strict_min_version: string;
  strict_max_version: string;
  primary_type: string;
}

export interface Options {
  default: Record<string, unknown>;
  schema: Record<string, unknown>;
}
