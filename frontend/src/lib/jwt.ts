type AccessTokenPayload = {
  exp: number;
  iat: number | undefined;
  sub: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const decodeAccessToken = (token: string): AccessTokenPayload => {
  const encodedPayload = token.split(".")[1];
  if (!encodedPayload) {
    throw new Error("Invalid JWT payload.");
  }

  const base64 = encodedPayload.replaceAll("-", "+").replaceAll("_", "/");
  const paddingLength = (4 - (base64.length % 4)) % 4;
  const decodedPayload: unknown = JSON.parse(
    atob(`${base64}${"=".repeat(paddingLength)}`),
  );

  if (
    !isRecord(decodedPayload) ||
    typeof decodedPayload.sub !== "string" ||
    typeof decodedPayload.exp !== "number"
  ) {
    throw new Error("Invalid JWT claims.");
  }

  return {
    exp: decodedPayload.exp,
    iat:
      typeof decodedPayload.iat === "number" ? decodedPayload.iat : undefined,
    sub: decodedPayload.sub,
  };
};

export const isAccessTokenExpired = (token: string): boolean => {
  const { exp } = decodeAccessToken(token);
  return exp * 1000 <= Date.now();
};
