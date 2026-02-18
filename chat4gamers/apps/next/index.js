import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// This allows Electron to understand TypeScript files on the fly
register('ts-node/esm', pathToFileURL('./'));

import './main.ts';