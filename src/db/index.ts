import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? process.env.DB_URL;
if (!url) throw new Error("Set DATABASE_URL (or DB_URL) in .env");

export const db = drizzle(neon(url), { schema });
