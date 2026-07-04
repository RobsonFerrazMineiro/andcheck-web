import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  scaffoldFindFirst: vi.fn(),
  nonConformityFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scaffold: {
      findFirst: prismaMocks.scaffoldFindFirst,
    },
    nonConformity: {
      findFirst: prismaMocks.nonConformityFindFirst,
    },
  },
}));

import { generateNextNonConformityCode } from "@/lib/non-conformity-code";
import { generateNextScaffoldTag } from "@/lib/scaffold-code";

describe("sequential code generators", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T12:00:00Z"));
    vi.clearAllMocks();
  });

  it("starts scaffold tag sequence at the current year", async () => {
    prismaMocks.scaffoldFindFirst.mockResolvedValue(null);

    await expect(generateNextScaffoldTag()).resolves.toBe("AND-2026-0001");
    expect(prismaMocks.scaffoldFindFirst).toHaveBeenCalledWith({
      where: { code: { startsWith: "AND-2026-" } },
      orderBy: { code: "desc" },
      select: { code: true },
    });
  });

  it("increments scaffold tag sequence from the latest code", async () => {
    prismaMocks.scaffoldFindFirst.mockResolvedValue({ code: "AND-2026-0042" });

    await expect(generateNextScaffoldTag()).resolves.toBe("AND-2026-0043");
  });

  it("starts non-conformity code sequence at the current year", async () => {
    prismaMocks.nonConformityFindFirst.mockResolvedValue(null);

    await expect(generateNextNonConformityCode()).resolves.toBe("NC-2026-0001");
  });

  it("increments non-conformity code sequence from the latest code", async () => {
    prismaMocks.nonConformityFindFirst.mockResolvedValue({
      code: "NC-2026-0009",
    });

    await expect(generateNextNonConformityCode()).resolves.toBe("NC-2026-0010");
  });
});
