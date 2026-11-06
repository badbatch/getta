#!/usr/bin/env node

// Is unresolved before library has been built.
// eslint-disable-next-line import-x/no-unresolved
import { runGettaCli } from 'getta/cli.mjs';

await runGettaCli();
