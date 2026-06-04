import { prisma } from "@/lib/prisma";

/**
 * Gera o próximo código/TAG sequencial para um andaime no padrão:
 * AND-YYYY-NNNN
 *
 * Exemplos:
 *   AND-2026-0001
 *   AND-2026-0002
 *   AND-2027-0001  ← reinicia no novo ano
 *
 * Garante unicidade: em caso de conflito por concorrência, incrementa e tenta
 * novamente (até 5 tentativas).
 */
export async function generateNextScaffoldTag(attempt = 0): Promise<string> {
  if (attempt >= 5) {
    throw new Error(
      "Não foi possível gerar um código único para o andaime após várias tentativas.",
    );
  }

  const year = new Date().getFullYear();
  const prefix = `AND-${year}-`;

  // Busca o último andaime do ano atual ordenado pelo código desc
  const last = await prisma.scaffold.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  let nextSeq = 1;
  if (last?.code) {
    // Extrai os 4 últimos dígitos: AND-2026-0042 → 42
    const parts = last.code.split("-");
    const lastSeq = parseInt(parts[2] ?? "0", 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  const padded = String(nextSeq).padStart(4, "0");
  return `${prefix}${padded}`;
}
