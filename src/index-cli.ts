#!/usr/bin/env node
import { loadEnv } from "./index";
import { z } from "zod";
import process from "process";

const schema = z.object({}); // ← replace with your own schema

loadEnv(schema)
  .then((env) => {
    console.log(JSON.stringify(env, null, 2));
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
