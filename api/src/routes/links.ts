import {Router} from "express";
import {z} from "zod";
import {createLink, listLinks} from "../services/links.js"
import {requireAuth} from "../middleware/requireAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import {findOwnedLinks, getLinkStats} from "../services/stats.js";
export const linksRouter = Router();

linksRouter.use(requireAuth);

const createLinkRateLimiter = rateLimit({
    name: "createLink",
    capacity: 10,// 10 requests per minute
    refillPerSec: 1/6, // 1 token every 6 seconds(10 tokens per minute)
    keyFn: (req) => req.userId!
});

const linkSchema = z.object({
    targetUrl: z.url().refine((u) => /^https?:\/\//i.test(u), "URL must start with http or https"),
    expiresAt: z.string().optional()
});

const statsQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

linksRouter.get('/:id/stats',async (req,res) =>{
    const {id} = req.params;
    const query = statsQuery.safeParse(req.query);
    if(!query.success) return res.status(400).json({error:'Invalid days'})

        try {
            const link = await findOwnedLinks(id, req.userId!); //ownership check
            if(!link) return res.status(404).json({error:'not found'})
                const stats = await getLinkStats(id, query.data.days)
            res.json({link, ...stats})
        } catch (error) {
            console.log(error);
            res.status(500).json({error:"Internal server erro"})
        }
})

linksRouter.post("/", createLinkRateLimiter, async (req, res) =>{
    const parsed = linkSchema.safeParse(req.body);
    console.log(req.body)
    if(!parsed.success){
        console.log(parsed, 'here it is')
        return res.status(400).json({error: "Invalid input", details: parsed.error.format()});
    }

    try{
        const {targetUrl, expiresAt} = parsed.data;
        const link = await createLink(targetUrl, req.userId!);
        return res.status(201).json({message: "Link created successfully", link});
    } catch (error) {
        console.error(error);
        return res.status(500).json({error: "Internal server error"});
    }
})

linksRouter.get("/", async (req, res) => {
    try{
        const links = await listLinks(req.userId!);
        return res.status(200).json({links});
    } catch (error) {
        return res.status(500).json({error: "Internal server error"});
    }
})