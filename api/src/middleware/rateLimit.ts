import type { Request, Response, NextFunction } from "express"; 
import { redis } from "../cache/redis.js";

const TOKEN_BUCKET_LUA =  `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill = tonumber(ARGV[2])  -- tokens per second

local t = redis.call("TIME")
local now = t[1] * 1000 + math.floor(t[2] / 1000)  -- ms

local data = redis.call("HMGET", key, "tokens", "last_refill")
local tokens = tonumber(data[1])
local last_refill = tonumber(data[2])
if tokens == nil then
  tokens = capacity
  last_refill = now
end

local elapsed = math.max(0, now - last_refill) / 1000
tokens = math.min(capacity, tokens + elapsed * refill)

local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end

redis.call("HSET", key, "tokens", tokens, "last_refill", now)
redis.call("PEXPIRE", key, math.ceil(capacity / refill * 1000) * 2)

local retry = 0
if allowed == 0 then retry = math.ceil((1 - tokens) / refill) end
return { allowed, retry }
`;

type Options = {
  name: string;          // namespace, e.g. "create-link"
  capacity: number;      
  refillPerSec: number;  
  keyFn: (req: Request) => string | undefined;
};

export function rateLimit({name, capacity, refillPerSec, keyFn}: Options) {
    return async function(req: Request, res: Response, next: NextFunction) {
        const id = keyFn(req);
        if(!id) return next();

        try{
            const [allowed, retryAfter] = (await redis.eval(
                TOKEN_BUCKET_LUA,
                1,
                `rl:${name}:${id}`,
                capacity,
                refillPerSec
            )) as [number, number]

            if(!allowed){res.set("Retry-After", String(retryAfter));
                return res.status(429).json({error: "Too many requests, please try again later."});
            }

        }catch(err){
            console.error("Rate limit error:", err);
        }
        next();


    }
}