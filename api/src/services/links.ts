import pool from "../db/pool.js";
import {generateCode} from "./code.js";
import {redis} from "../cache/redis.js";

const CACHE_TTL = 60 * 60; // 1 hour in seconds
const NOT_FOUND_CACHE_TTL = 30; //THIS is the time in seconds to cache a "not found" result for a link code. This is to prevent repeated database lookups for non-existent codes, which can help reduce load on the database and improve performance. The value of 30 seconds is a balance between caching efficiency and ensuring that if a link is created shortly after a failed lookup, it will be found on subsequent requests.


export async function createLink(targetUrl: string, userId: string) {
  for (let attempt = 0; attempt < 5; attempt++) { // try up to 5 times to generate a unique code
    const code = generateCode();
    try {
      const { rows } = await pool.query(
        `INSERT INTO links (code, target_url, user_id)
         VALUES ($1, $2, $3)
         RETURNING code, target_url, created_at`,
        [code, targetUrl, userId]
      );
      return rows[0];
    } catch (err: any) {
      if (err.code === "23505") continue; // unique violation: code collision, retry
      throw err;
    }
  }
  throw new Error("Could not generate a unique code");
}

export async function findActiveLink(code: string) {
  const key = `link:${code}`;
  try{
    const cached = await redis.get(key);
    if(cached === "__none__") return null; //cached "not found" result
    if(cached) return JSON.parse(cached) as {target_url: string}; //return cached result if found;
  }
  catch(err){
    console.error("Redis error:", err);
  }

  const { rows } = await pool.query(
    `SELECT target_url FROM links
     WHERE code = $1 AND (expires_at IS NULL OR expires_at > now())`,
    [code]
  );
  const link = rows[0]

//populate the cache with the result, whether found or not
try{
  if(!link){
    await redis.set(key, "__none__", "EX", NOT_FOUND_CACHE_TTL); //cache "not found" result for 30 seconds
  }else{
    let ttl = CACHE_TTL;
    if(link.expires_at){//if
      const secondsLeft = Math.floor((new Date(link.expires_at).getTime() - Date.now()) / 1000);
      ttl = Math.max(1, Math.min(ttl, secondsLeft));
    }
    await redis.set(key, JSON.stringify({target_url: link.target_url}), "EX", ttl);
  }
}catch
(err){
  console.error("Redis error:", err);
}

return link ? {target_url: link.target_url} : null;

}
export async function listLinks( userId: string) {
  const{ rows } = await pool.query(
    `SELECT code, target_url, created_at, expires_at FROM links
    WHERE user_id = $1`,
    [ userId]
  );
  return rows;
}