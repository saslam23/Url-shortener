//create a user, hash it with bcrypt, and store it in the database, then get the user by email
import bcrypt from "bcrypt";
import pool from "../db/pool.js";

export async function createUser(email: string, password: string) {
  const password_hash = await bcrypt.hash(password, 12);//salt round of 12
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id, email, created_at`,
    [email.toLowerCase(), password_hash]
  );
  return rows[0];
}

export async function findUserByEmail(email: string) {

    const { rows } = await pool.query( `select id, email, password_hash from users where email = $1`, [email.toLowerCase()]);
    return rows[0] ?? null;
 }