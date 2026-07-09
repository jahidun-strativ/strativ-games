import "dotenv/config";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL ?? process.env.DB_URL);
const email = "jahidun.nur@strativ.se";
// Find the user's id from their player row (created on first visit).
const players = await sql`select user_id from players where lower(email)=lower(${email}) and user_id is not null limit 1`;
if (!players.length) { console.log("No linked player/user found for", email, "- they must sign in once first."); process.exit(0); }
const userId = players[0].user_id;
await sql`
  insert into app_users (user_id, email, role) values (${userId}, ${email}, 'admin')
  on conflict (user_id) do update set role='admin'
`;
const rows = await sql`select email, role from app_users where user_id=${userId}`;
console.log("Set admin:", rows[0]);
