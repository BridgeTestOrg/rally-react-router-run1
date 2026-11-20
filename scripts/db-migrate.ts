import { openDb } from "../app/db/db.server.ts";
import { DATABASE_PATH } from "../app/lib/config.server.ts";

const db = openDb(DATABASE_PATH);
try {
  console.log("Database is up to date.");
} finally {
  db.close();
}
