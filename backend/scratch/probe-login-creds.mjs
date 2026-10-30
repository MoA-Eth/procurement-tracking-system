import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";

const candidates = [
  process.env.BOOTSTRAP_ADMIN_PASSWORD,
  "Password123!",
  "password",
  "Admin@123",
].filter(Boolean);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rows } = await client.query(
  'SELECT email, "passwordHash" FROM "User" ORDER BY email',
);

for (const row of rows) {
  const hits = [];
  for (let i = 0; i < candidates.length; i++) {
    if (await bcrypt.compare(candidates[i], row.passwordHash)) hits.push(i);
  }
  console.log(`${row.email} -> ${hits.length ? hits.join(",") : "none"}`);
}

console.log(
  `\nCandidate index map: ${candidates
    .map((c, i) => `${i}=${c === process.env.BOOTSTRAP_ADMIN_PASSWORD ? "(env BOOTSTRAP_ADMIN_PASSWORD)" : JSON.stringify(c)}`)
    .join("  ")}`,
);

await client.end();
