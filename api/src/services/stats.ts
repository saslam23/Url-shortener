import pool from "../db/pool.js";


export async function findOwnedLinks(linkId: string, userId: string) {
    const { rows } = await pool.query(`select id, code, target_url, created_at from links where id =$1 and user_id = $2`, [linkId,userId]);
    return rows[0] ?? null;
}

export async function getLinkStats(linkId:string, days: number){
    const [total, perDay, referrers, devices] = await Promise.all([
        pool.query(`select count(*) as total from clicks where link_id = $1`, [linkId]),

        //gets amount clicked per day for each day specified by the time interval.
  pool.query(
      `SELECT d::date AS day, count(c.id)::int AS clicks
       FROM generate_series(
              ((now() AT TIME ZONE 'utc')::date - ($2::int - 1))::timestamp,
              (now() AT TIME ZONE 'utc')::date::timestamp,
              interval '1 day') AS d
       LEFT JOIN clicks c
         ON c.link_id = $1
        AND c.clicked_at >= (d AT TIME ZONE 'utc')
        AND c.clicked_at <  ((d + interval '1 day') AT TIME ZONE 'utc')
       GROUP BY d
       ORDER BY d`,
      [linkId, days]
    ),

    pool.query(`
        select coalesce(substring(referrer from '^https?://([^/]+)'),'Direct/ unknown')AS referrer,
        count(*)::int as clicks
        from clicks
        where link_id = $1
        group by 1
        order by clicks desc
        limit 10
        
        `,[linkId]),

    pool.query(
      `SELECT CASE
                WHEN user_agent IS NULL THEN 'Unknown'
                WHEN user_agent ILIKE '%bot%' OR user_agent ILIKE '%curl%' THEN 'Bot / script'
                WHEN user_agent ILIKE '%ipad%' OR user_agent ILIKE '%tablet%' THEN 'Tablet'
                WHEN user_agent ILIKE '%mobi%' OR user_agent ILIKE '%iphone%' THEN 'Mobile'
                ELSE 'Desktop'
              END AS device,
              count(*)::int AS clicks
       FROM clicks
       WHERE link_id = $1
       GROUP BY 1
       ORDER BY clicks DESC`,
      [linkId]
    ),
    ])
    return{
        total: total.rows[0].total,
        perDay: perDay.rows,
        referrers: referrers.rows,
        devices: devices.rows
    }
}