import { SE1_BA } from './compiled/SE1_BA.js';
import { SE1_BAE } from './compiled/SE1_BAE.js';
import { SE1_BM } from './compiled/SE1_BM.js';
import { SE1_BS } from './compiled/SE1_BS.js';
import { SE1_FNT } from './compiled/SE1_FNT.js';
import { SE1_MDL } from './compiled/SE1_MDL.js';
import { SE1_WLD } from './compiled/SE1_WLD.js';
import { SE2_Metadata } from './compiled/SE2_Metadata.js';

export const PARSERS = {
  ba: SE1_BA,
  bae: SE1_BAE,
  bm: SE1_BM,
  bs: SE1_BS,
  fnt: SE1_FNT,
  mdl: SE1_MDL,
  wld: SE1_WLD,
  tex: SE2_Metadata
};

export function getParserForExtension(extension: string) {
  return PARSERS[extension.toLowerCase() as keyof typeof PARSERS];
}

export {
  SE1_BA,
  SE1_BAE,
  SE1_BM,
  SE1_BS,
  SE1_FNT,
  SE1_MDL,
  SE1_WLD,
  SE2_Metadata
};