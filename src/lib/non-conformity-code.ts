import { prisma } from "@/lib/prisma";

export async function generateNextNonConformityCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `NC-${year}-`;

  const last = await prisma.nonConformity.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  let nextSeq = 1;
  if (last?.code) {
    const parts = last.code.split("-");
    const lastSeq = parseInt(parts[2] ?? "0", 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}
