// Integration tests run against the DEV Supabase project only.
// Loads .env.dev (git-ignored) and refuses to start if pointed anywhere else.
import fs from "node:fs";
import path from "node:path";

export const DEV_PROJECT_REF = "ikjusswwskrkjwxovgza";

const envFile = path.resolve(import.meta.dirname, "../../.env.dev");
if (!fs.existsSync(envFile)) {
  throw new Error("Missing .env.dev — integration tests need the dev project credentials.");
}
process.loadEnvFile(envFile);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!url.includes(DEV_PROJECT_REF)) {
  throw new Error(`Refusing to run integration tests against ${url || "an unset URL"}: not the dev project.`);
}
for (const name of ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "DEV_SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!process.env[name]) throw new Error(`Missing ${name} in .env.dev`);
}

// Server code under test (lib/api/service.ts) reads the standard variable name; point it at DEV.
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.DEV_SUPABASE_SERVICE_ROLE_KEY;
// Never send real email from tests.
delete process.env.RESEND_API_KEY;
