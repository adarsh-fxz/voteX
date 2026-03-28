// Server-only Pinata helpers. Import only from Route Handlers

const PIN_FILE = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PIN_JSON = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

function authHeaders(jwt: string): HeadersInit {
  return { Authorization: `Bearer ${jwt}` };
}

export type PinataPinResponse = {
  IpfsHash: string;
  PinSize?: number;
};

export async function pinFileToIpfs(
  jwt: string,
  file: Blob,
  name?: string,
): Promise<PinataPinResponse> {
  const form = new FormData();
  form.append("file", file, name ?? "file");
  const res = await fetch(PIN_FILE, {
    method: "POST",
    headers: authHeaders(jwt),
    body: form,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Pinata pinFile: ${res.status} ${t}`);
  }
  return res.json() as Promise<PinataPinResponse>;
}

export async function pinJsonToIpfs(
  jwt: string,
  body: Record<string, unknown>,
  name?: string,
): Promise<PinataPinResponse> {
  const res = await fetch(PIN_JSON, {
    method: "POST",
    headers: {
      ...authHeaders(jwt),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: body,
      pinataMetadata: name ? { name } : undefined,
      pinataOptions: { cidVersion: 1 },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Pinata pinJSON: ${res.status} ${t}`);
  }
  return res.json() as Promise<PinataPinResponse>;
}

export async function pinBytesToIpfs(
  jwt: string,
  bytes: Uint8Array,
  name: string,
): Promise<PinataPinResponse> {
  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/octet-stream",
  });
  return pinFileToIpfs(jwt, blob, name);
}
