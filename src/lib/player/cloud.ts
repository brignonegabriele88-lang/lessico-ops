import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

const profilePayload = z.object({
  version: z.number(),
  callsign: z.string().max(16),
  xp: z.number(),
  games: z.number(),
  wins: z.number(),
  losses: z.number(),
  draws: z.number(),
  bestScore: z.number(),
  longestWord: z.string(),
  uniqueWords: z.array(z.string()).max(5000),
  totalFound: z.number(),
  achievements: z.array(z.string()),
  lastDaily: z.string().nullable(),
  muted: z.boolean(),
  missionsCompleted: z.array(z.string()),
});

export const loadCloudProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<{ payload: unknown }>(
      `select payload from player_profiles where user_id = $1 limit 1`,
      [context.userId],
    );
    return rows[0]?.payload ?? null;
  });

export const saveCloudProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => profilePayload.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql.query(
      `insert into player_profiles (user_id, payload, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (user_id)
       do update set payload = excluded.payload, updated_at = now()`,
      [context.userId, JSON.stringify(data)],
    );
    return { ok: true as const };
  });
