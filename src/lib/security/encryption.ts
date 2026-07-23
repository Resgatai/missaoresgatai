import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKey() {
  const dedicatedSecret = process.env.DATA_ENCRYPTION_KEY;
  if (dedicatedSecret) {
    if (dedicatedSecret.length < 32) throw new Error("DATA_ENCRYPTION_KEY deve ter ao menos 32 caracteres.");
    return createHash("sha256").update(dedicatedSecret).digest();
  }
  if (!process.env.AUTH_SECRET) throw new Error("Defina DATA_ENCRYPTION_KEY ou AUTH_SECRET para proteger os dados sensíveis.");
  return createHmac("sha256", process.env.AUTH_SECRET).update("missao-resgatai:data-encryption:v1").digest();
}

export function encryptSensitiveText(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(":");
}

export function decryptSensitiveText(value: string) {
  const [version, iv, tag, ciphertext] = value.split(":");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Formato de dado protegido inválido.");
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
