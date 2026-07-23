import { inArray } from "drizzle-orm";
import { firebaseMessaging } from "@/lib/firebase-admin";
import { getDb } from "@/lib/db";
import { notifications, pushDevices } from "@/lib/db/schema";

type PushInput = { title: string; body?: string; href?: string };

/** Writes the in-app notification and best-effort delivers it to registered FCM devices. */
export async function notifyUsers(userIds: string[], input: PushInput) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return;
  const db = getDb();
  await db.insert(notifications).values(ids.map((userId) => ({ userId, title: input.title, body: input.body, href: input.href })));
  const devices = await db.select({ token: pushDevices.token }).from(pushDevices).where(inArray(pushDevices.userId, ids));
  if (!devices.length) return;
  try {
    const response = await firebaseMessaging().sendEachForMulticast({
      tokens: devices.map((device) => device.token),
      notification: { title: input.title, body: input.body || "" },
      data: input.href ? { url: input.href } : undefined,
    });
    const invalidTokens = response.responses.flatMap((result, index) => {
      const code = result.error?.code;
      return code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token" ? [devices[index]?.token].filter((token): token is string => Boolean(token)) : [];
    });
    if (invalidTokens.length) await db.delete(pushDevices).where(inArray(pushDevices.token, invalidTokens));
  } catch (error) {
    // Firebase is optional in local development; in-app notifications remain available.
    console.error("Falha ao enviar notificação push", error);
  }
}
