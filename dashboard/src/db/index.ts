import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Connection pool configuration: Yeh auto-reconnection aur query pooling sambhalega
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Primary Database Instance wrapper jo pure Next.js application me query chalane ke kaam aayega
export const db = drizzle(pool, { schema });