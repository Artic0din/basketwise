import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null = null;

/**
 * Lazy-initialised database client.
 * Defers the DATABASE_URL check to first use so Next.js can build
 * without a live database connection.
 */
export const db: NeonHttpDatabase<typeof schema> = new Proxy(
  {} as NeonHttpDatabase<typeof schema>,
  {
    get(_target, prop) {
      if (!_db) {
        const url = process.env["DATABASE_URL"];
        if (!url) {
          throw new Error("DATABASE_URL environment variable is required");
        }
        const sqlClient = neon(url);
        _db = drizzle(sqlClient, { schema });
      }
      return Reflect.get(_db, prop);
    },
  },
);
