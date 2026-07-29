const CODE_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  ADMIN_EMPRESA: "Admin da empresa",
  ARCHIVED: "Arquivado",
  ASSIGNED: "Em correção",
  CANCELLED: "Cancelado",
  CLOSED: "Encerrado",
  CL_FAIL: "Não conforme",
  CL_NA: "Não aplicável",
  CL_OK: "Conforme",
  CL_WARN: "Com ressalva",
  COMPLETE: "Concluído",
  CREATE: "Criação",
  DELETE: "Exclusão",
  DOCUMENT_CREATED: "Documento criado",
  DOCUMENT_DOWNLOADED: "Documento baixado",
  DOCUMENT_UPDATED: "Documento atualizado",
  DOCUMENT_VIEWED: "Documento visualizado",
  EXPIRED: "Vencido",
  HSE_EMPRESA: "HSE da empresa",
  HSE_GERENCIADORA: "HSE gerenciadora",
  HSE_HYDRO: "HSE da contratante",
  HIGH: "Alta",
  IN_PROGRESS: "Em tratamento",
  LOW: "Baixa",
  MEDIUM: "Média",
  NON_CONFORMITY: "Não conformidade",
  OPEN: "Aberto",
  PENDING_VERIFICATION: "Aguardando verificação",
  REJECTED: "Rejeitado",
  SIGN: "Assinatura",
  conflict: "Conflito",
  failed: "Falhou",
  synced: "Sincronizado",
  SETTINGS: "Configuração",
  SCAFFOLD: "Andaime",
  INSPECTION: "Inspeção",
  NONCONFORMITY: "Não conformidade",
  DOCUMENT: "Documento",
  NOTIFICATION: "Notificação",
  QR_CODE: "QR Code",
  STATUS_CHANGE: "Alteração de status",
  SUPER_ADMIN: "Super admin",
  SUPERVISOR: "Supervisor",
  SUPERVISOR_ENCARREGADO: "Supervisor/Encarregado",
  UPDATE: "Atualização",
  UPLOAD: "Anexo",
  VIEWER: "Visualizador",
  aprovado: "Aprovado",
  aprovado_com_ressalvas: "Aprovado com ressalvas",
  cancelled: "Cancelado",
  closed: "Encerrado",
  concluido: "Concluído",
  desmontado: "Desmontado",
  em_montagem: "Em montagem",
  in_progress: "Em tratamento",
  interditado: "Interditado",
  liberado: "Liberado",
  nao_aplicavel: "Não aplicável",
  nao_conforme: "Não conforme",
  "document.add": "Anexar documento",
  "inspection.create": "Criar inspeção",
  "nonConformity.comment.add": "Adicionar comentário na NC",
  "nonConformity.dueDate.update": "Alterar prazo da NC",
  "nonConformity.evidence.add": "Anexar evidência na NC",
  "nonConformity.responsible.update": "Alterar responsável da NC",
  "nonConformity.status.update": "Alterar status da NC",
  pending_release: "Pendente de liberação",
  pendente_liberacao: "Pendente de liberação",
  reprovado: "Reprovado",
  "scaffold.assembly.complete": "Concluir montagem",
  "scaffold.create": "Criar andaime",
  "scaffold.dismantle": "Desmontar andaime",
  "scaffold.update": "Editar andaime",
  tubular: "Tubular",
  vencido: "Vencido",
};

export function humanizeCode(value: string | null | undefined) {
  if (!value) return "";
  const label = CODE_LABELS[value];
  if (label) return label;

  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll(".", " ")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)\S/g, (letter) => letter.toLocaleUpperCase("pt-BR"));
}

export function humanizeChecklistCategory(value: string) {
  return humanizeCode(value);
}

export function humanizeChecklistValue(value: string) {
  return humanizeCode(value);
}
