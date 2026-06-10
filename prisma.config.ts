import { config } from "dotenv";
import { defineConfig, env } from "@prisma/config";

config({ path: ".env" });

export default defineConfig({
  migrations: {
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
