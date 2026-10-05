import { describe, expect, it } from "vitest";
import { hasSessionCookie, isPublicPath } from "@/lib/auth/session-cookie";

describe("protection des routes", () => {
  it("laisse passer les chemins publics", () => {
    expect(isPublicPath("/connexion")).toBe(true);
    expect(isPublicPath("/api/auth/callback/google")).toBe(true);
    expect(isPublicPath("/api/auth")).toBe(true);
  });

  it("protège les autres chemins", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/a-traiter")).toBe(false);
    expect(isPublicPath("/api/sante")).toBe(false);
    expect(isPublicPath("/connexion-bis")).toBe(false);
  });

  it("détecte le cookie de session en HTTP et en HTTPS", () => {
    expect(hasSessionCookie((name) => name === "authjs.session-token")).toBe(true);
    expect(hasSessionCookie((name) => name === "__Secure-authjs.session-token")).toBe(true);
    expect(hasSessionCookie(() => false)).toBe(false);
  });
});
