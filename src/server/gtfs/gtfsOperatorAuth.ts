import { timingSafeEqual } from "node:crypto";

export function isGtfsOperatorAuthorized(
  request: Request,
  expectedToken: string,
): boolean {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return false;
  }
  const suppliedToken = authorization.slice("Bearer ".length);
  const expectedBytes = Buffer.from(expectedToken);
  const suppliedBytes = Buffer.from(suppliedToken);
  return (
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}
