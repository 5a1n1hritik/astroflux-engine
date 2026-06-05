import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// .env file se database URL read karne ke liye
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/astroflux",
  },
});
