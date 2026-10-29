const PREFIX = "WSCc:";
const HASH_LENGTH = 30;

export async function wealthsimpleImportId(canonicalId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalId);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return `${PREFIX}${hash.slice(0, HASH_LENGTH)}`;
}
