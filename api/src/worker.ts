import "dotenv/config";
import { redis } from "./cache/redis.js";
import pool  from "./db/pool.js";
import  { CLICK_QUEUE, type ClickEvent } from "./services/clicks.js";

const BATCH_SIZE = 500; // maximum number of click events to process in one batch
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)); // utility function to pause execution for a given number of milliseconds

async function insertBatch(events: ClickEvent[]) {//unnest the arrays of click event data into a set of rows
  await pool.query(
    `INSERT INTO clicks (link_id, clicked_at, referrer, user_agent)
     SELECT l.id, e.clicked_at, e.referrer, e.user_agent
     FROM unnest($1::text[], $2::timestamptz[], $3::text[], $4::text[]) 
          AS e(code, clicked_at, referrer, user_agent)
     JOIN links l ON l.code = e.code`,
    [
      events.map((e) => e.code),
      events.map((e) => e.clickedAt),
      events.map((e) => e.referrer),
      events.map((e) => e.userAgent),
    ]
  );
}

async function run() { // main worker loop
  console.log("Click worker started");
  while (true) {
    let raw: string[] | null = null;
    try {
      raw = await redis.lpop(CLICK_QUEUE, BATCH_SIZE); // retrieve a batch of click events from the Redis queue
      if (!raw || raw.length === 0) {
        await sleep(1000);
        continue;
      }
      await insertBatch(raw.map((r) => JSON.parse(r)));//array of click events to insert into the database
    } catch (err) {
      console.error("Worker error", err);
      if (raw && raw.length) {
        await redis.lpush(CLICK_QUEUE, ...raw.reverse()).catch(() => {}); // put them back
      }
      await sleep(2000);
    }
  }
}

run(); 
//worker is constantly running, waiting for click events to be added to the Redis queue, and processing them in batches. It will retry on errors and log any issues that occur.