import {redis} from "../cache/redis.js";

export const CLICK_QUEUE = "clicks:queue";

export type ClickEvent ={
    code: string;
    clickedAt: string;
    referrer: string | null;
    userAgent: string | null;
}


export function recordClick(event: ClickEvent){
    redis.rpush(CLICK_QUEUE, JSON.stringify(event)).catch(err => { //goes into redisqueue, and worker will pick it up and insert into database
        console.error("Failed to enqueue click event:", err);
    })
}