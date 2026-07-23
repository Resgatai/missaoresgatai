import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function writeAuditLog(input: { actorId?: string; action: string; entityType: string; entityId?: string; metadata?: Record<string, unknown>; previousData?: Record<string, unknown> | null; newData?: Record<string, unknown> | null }) {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  await getDb().insert(auditLogs).values({ actorId: input.actorId ?? null, action: input.action, entityType: input.entityType, entityId: input.entityId, metadata: input.metadata ?? {}, previousData: input.previousData ?? null, newData: input.newData ?? null, ipAddress: forwarded?.split(",")[0]?.trim() ?? null, userAgent: requestHeaders.get("user-agent")?.slice(0, 500) ?? null });
}
