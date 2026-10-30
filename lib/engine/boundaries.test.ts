import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".ts") && !full.endsWith(".test.ts") ? [full] : [];
  });
}

describe("engine boundaries", () => {
  it("keeps calculations free of network clients", () => {
    const roots = ["lib/engine", "lib/facts", "lib/hazards", "lib/location", "lib/units"].map(
      (dir) => path.join(process.cwd(), dir),
    );
    const banned = [
      "@/lib/supabase",
      "@/lib/ai",
      "@/lib/email",
      "next/headers",
      "generativelanguage",
      "api.resend.com",
    ];
    for (const file of roots.flatMap(sourceFiles)) {
      const source = readFileSync(file, "utf8");
      for (const token of banned) {
        expect(source, file).not.toContain(token);
      }
    }
  });
});
