import { describe, expect, it } from "vitest";

import { humanizeCode } from "@/lib/human-readable";

describe("humanizeCode", () => {
  it("traduz códigos internos conhecidos para rótulos humanos", () => {
    expect(humanizeCode("CL_FAIL")).toBe("Não conforme");
    expect(humanizeCode("STATUS_CHANGE")).toBe("Alteração de status");
    expect(humanizeCode("ASSIGNED")).toBe("Em correção");
    expect(humanizeCode("ADMIN_EMPRESA")).toBe("Admin da empresa");
  });

  it("formata códigos novos sem expor separadores técnicos", () => {
    expect(humanizeCode("nonConformity.status.update")).toBe(
      "Alterar status da NC",
    );
    expect(humanizeCode("pending_release")).toBe("Pendente de liberação");
  });
});
