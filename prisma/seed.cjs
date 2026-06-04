/**
 * Seed — AndCheck EHS
 * Contexto: Hydro Alunorte S.A. — Barcarena, Pará, Brasil
 * Coordenadas centrais da planta: -1.5205, -48.6278
 */

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Andaimes ─────────────────────────────────────────────────────────────────
const scaffolds = [
  {
    id: 'sc_01',
    code: 'AND-2026-0001', tag: 'AND-2026-0001',
    type: 'tubular', status: 'liberado',
    location: 'Digestor D-04 — Nivel 3', area: 'Area de Digestao',
    company: 'Construtora Andaimes Norte Ltda',
    height: 9.5, width: 2.0, length: 6.0, max_load: 300,
    responsible: 'Eng. Carlos Henrique Matos',
    validity_date: new Date('2026-07-04'),
    released_at: new Date('2026-06-04'),
    latitude: -1.5198, longitude: -48.6265,
    location_description: 'Lateral leste do digestor D-04, proximo a saida de lama.',
  },
  {
    id: 'sc_02',
    code: 'AND-2026-0002', tag: 'AND-2026-0002',
    type: 'fachadeiro', status: 'pendente_liberacao',
    location: 'Torre de Calcinacao TC-02 — Fachada Sul', area: 'Area de Calcinacao',
    company: 'Andaimes e Servicos Barcarena ME',
    height: 14.0, width: 2.5, length: 12.0, max_load: 250,
    responsible: 'Eng. Ana Paula Ferreira',
    validity_date: null,
    assembly_completed_at: new Date('2026-06-03'),
    latitude: -1.5212, longitude: -48.6282,
    location_description: 'Fachada sul da torre de calcinacao TC-02.',
  },
  {
    id: 'sc_03',
    code: 'AND-2026-0003', tag: 'AND-2026-0003',
    type: 'multidirecional', status: 'reprovado',
    location: 'Torre de Resfriamento TR-05', area: 'Utilidades',
    company: 'Metalica Servicos Industriais S.A.',
    height: 7.0, width: 1.5, length: 4.0, max_load: 200,
    responsible: 'Tec. Joao Raimundo Silva',
    validity_date: null,
    latitude: -1.5220, longitude: -48.6291,
    location_description: 'Base da torre de resfriamento TR-05.',
  },
  {
    id: 'sc_04',
    code: 'AND-2026-0004', tag: 'AND-2026-0004',
    type: 'tubular', status: 'em_montagem',
    location: 'Precipitador P-08 — Plataforma Central', area: 'Area de Precipitacao',
    company: 'Construtora Andaimes Norte Ltda',
    height: 6.0, width: 2.0, length: 4.0, max_load: 300,
    responsible: 'Tec. Pedro Augusto Costa',
    validity_date: null,
    latitude: -1.5190, longitude: -48.6270,
    location_description: 'Plataforma central do precipitador P-08.',
  },
  {
    id: 'sc_05',
    code: 'AND-2026-0005', tag: 'AND-2026-0005',
    type: 'suspenso', status: 'liberado',
    location: 'Silo de Hidroxido SH-03', area: 'Area de Precipitacao',
    company: 'Andaimes e Servicos Barcarena ME',
    height: 18.0, width: 1.2, length: 8.0, max_load: 150,
    responsible: 'Eng. Fernanda Cristina Rocha',
    validity_date: new Date('2026-07-01'),
    released_at: new Date('2026-06-01'),
    latitude: -1.5195, longitude: -48.6258,
    location_description: 'Estrutura suspensa no silo SH-03 para inspecao de topo.',
  },
  {
    id: 'sc_06',
    code: 'AND-2026-0006', tag: 'AND-2026-0006',
    type: 'torre', status: 'liberado',
    location: 'Chamine Principal CH-01 — Manutencao', area: 'Area de Calcinacao',
    company: 'Metalica Servicos Industriais S.A.',
    height: 22.0, width: 2.5, length: 2.5, max_load: 500,
    responsible: 'Eng. Roberto Alves Nunes',
    validity_date: new Date('2026-05-20'),
    released_at: new Date('2026-04-20'),
    latitude: -1.5207, longitude: -48.6275,
    location_description: 'Andaime torre para manutencao da chamine CH-01.',
  },
  {
    id: 'sc_07',
    code: 'AND-2026-0007', tag: 'AND-2026-0007',
    type: 'tubular', status: 'pendente_liberacao',
    location: 'Subestacao Eletrica SE-04 — Quadro Principal', area: 'Utilidades',
    company: 'Construtora Andaimes Norte Ltda',
    height: 4.5, width: 1.5, length: 3.0, max_load: 300,
    responsible: 'Tec. Mariana Souza Lima',
    validity_date: null,
    assembly_completed_at: new Date('2026-06-02'),
    latitude: -1.5185, longitude: -48.6299,
    location_description: 'Lateral do quadro principal da SE-04.',
  },
  {
    id: 'sc_08',
    code: 'AND-2026-0008', tag: 'AND-2026-0008',
    type: 'tubular', status: 'liberado',
    location: 'Moinho de Bolas MB-02 — Manutencao Mecanica', area: 'Area de Moagem',
    company: 'Andaimes e Servicos Barcarena ME',
    height: 5.5, width: 2.0, length: 3.5, max_load: 300,
    responsible: 'Eng. Luis Fernando Braga',
    validity_date: new Date('2026-06-28'),
    released_at: new Date('2026-05-29'),
    latitude: -1.5215, longitude: -48.6260,
    location_description: 'Area de manutencao mecanica do moinho MB-02.',
  },
  {
    id: 'sc_09',
    code: 'AND-2026-0009', tag: 'AND-2026-0009',
    type: 'fachadeiro', status: 'interditado',
    location: 'Tanque de Caustificacao TQ-07', area: 'Area de Caustificacao',
    company: 'Metalica Servicos Industriais S.A.',
    height: 8.0, width: 3.0, length: 8.0, max_load: 250,
    responsible: 'Tec. Antonio Carlos Figueiredo',
    validity_date: null,
    latitude: -1.5202, longitude: -48.6285,
    location_description: 'Entorno do tanque de caustificacao TQ-07.',
  },
  {
    id: 'sc_10',
    code: 'AND-2026-0010', tag: 'AND-2026-0010',
    type: 'tubular', status: 'em_montagem',
    location: 'Caldeira CV-03 — Parede de Agua', area: 'Geracao de Vapor',
    company: 'Construtora Andaimes Norte Ltda',
    height: 12.0, width: 2.0, length: 5.0, max_load: 300,
    responsible: 'Eng. Simone Pinheiro Tavares',
    validity_date: null,
    latitude: -1.5225, longitude: -48.6270,
    location_description: 'Parede de agua da caldeira CV-03, lado operador.',
  },
];

// ── Checklist padrao (itens alinhados ao template real da aplicacao) ──────────
function checklistCompleto(result) {
  const ok   = 'CL_OK';
  const fail = 'CL_FAIL';
  const warn = 'CL_WARN';
  const na   = 'CL_NA';

  const all = [
    { item_id: '0_0', item_label: 'ART/RRT de montagem esta disponivel e valida',      category: 'Seguranca Documental', value: ok,   critical: true  },
    { item_id: '0_1', item_label: 'Projeto estrutural do andaime disponivel',           category: 'Seguranca Documental', value: ok,   critical: true  },
    { item_id: '0_2', item_label: 'Ordem de servico de montagem preenchida',            category: 'Seguranca Documental', value: ok,   critical: false },
    { item_id: '0_3', item_label: 'PT (Permissao de Trabalho) emitida e valida',        category: 'Seguranca Documental', value: ok,   critical: true  },
    { item_id: '0_4', item_label: 'Montador possui capacitacao NR-18 e NR-35',          category: 'Seguranca Documental', value: ok,   critical: true  },
    { item_id: '0_5', item_label: 'Memorial de calculo disponivel (quando aplicavel)',  category: 'Seguranca Documental', value: na,   critical: false },
    { item_id: '0_6', item_label: 'Placa de identificacao com carga maxima fixada',     category: 'Seguranca Documental', value: ok,   critical: true  },
    { item_id: '1_0', item_label: 'Base/sapatas apoiadas em superficie firme e nivelada', category: 'Estrutura', value: ok, critical: true  },
    { item_id: '1_1', item_label: 'Contraventamentos instalados corretamente',          category: 'Estrutura', value: ok,   critical: true  },
    { item_id: '1_2', item_label: 'Travamento e amarracao a estrutura adequados',       category: 'Estrutura', value: ok,   critical: true  },
    { item_id: '1_3', item_label: 'Plataformas de trabalho completas e travadas',       category: 'Estrutura', value: ok,   critical: true  },
    { item_id: '1_4', item_label: 'Sem deformacoes, trincas ou corrosao nos tubos',    category: 'Estrutura', value: ok,   critical: true  },
    { item_id: '1_5', item_label: 'Bracadeiras/acopladores em bom estado e torqueados', category: 'Estrutura', value: ok,  critical: false },
    { item_id: '1_6', item_label: 'Montantes alinhados e prumo verificado',             category: 'Estrutura', value: ok,   critical: false },
    { item_id: '1_7', item_label: 'Rodape instalado em todas as plataformas (min. 20cm)', category: 'Estrutura', value: ok, critical: true },
    { item_id: '1_8', item_label: 'Tela de protecao instalada (quando necessario)',     category: 'Estrutura', value: na,   critical: false },
    { item_id: '2_0', item_label: 'Escada de acesso interna com degraus antiderrapantes', category: 'Acesso e Protecao', value: ok, critical: true },
    { item_id: '2_1', item_label: 'Alcapao de acesso com fechamento automatico',        category: 'Acesso e Protecao', value: ok, critical: false },
    { item_id: '2_2', item_label: 'Guarda-corpo superior instalado (1,20m de altura)',  category: 'Acesso e Protecao', value: ok, critical: true  },
    { item_id: '2_3', item_label: 'Guarda-corpo intermediario instalado (0,70m)',       category: 'Acesso e Protecao', value: ok, critical: true  },
    { item_id: '2_4', item_label: 'Sistema de linha de vida instalado (quando aplicavel)', category: 'Acesso e Protecao', value: ok, critical: true },
    { item_id: '2_5', item_label: 'Sinalizacao e isolamento da area executados',        category: 'Acesso e Protecao', value: ok, critical: false },
    { item_id: '2_6', item_label: 'Rede de seguranca ou bandeja coletora',              category: 'Acesso e Protecao', value: na, critical: false },
    { item_id: '3_0', item_label: 'Distancia segura de redes eletricas energizadas',   category: 'Instalacoes Eletricas', value: ok, critical: true },
    { item_id: '3_1', item_label: 'Aterramento do andaime (quando metalico proximo a rede)', category: 'Instalacoes Eletricas', value: ok, critical: true },
    { item_id: '3_2', item_label: 'Iluminacao adequada no local de trabalho',           category: 'Instalacoes Eletricas', value: ok, critical: false },
    { item_id: '3_3', item_label: 'Instalacao eletrica provisoria em conformidade',    category: 'Instalacoes Eletricas', value: na, critical: false },
    { item_id: '4_0', item_label: 'Capacete com jugular disponivel',                    category: 'EPIs e Seguranca', value: ok, critical: true  },
    { item_id: '4_1', item_label: 'Cinto de seguranca tipo paraquedista com talabarte duplo', category: 'EPIs e Seguranca', value: ok, critical: true },
    { item_id: '4_2', item_label: 'Calcado de seguranca adequado',                     category: 'EPIs e Seguranca', value: ok, critical: false },
    { item_id: '4_3', item_label: 'Luvas de protecao disponiveis',                     category: 'EPIs e Seguranca', value: ok, critical: false },
    { item_id: '4_4', item_label: 'Oculos de protecao disponiveis',                    category: 'EPIs e Seguranca', value: ok, critical: false },
    { item_id: '4_5', item_label: 'Trabalhadores com ASO valido para trabalho em altura', category: 'EPIs e Seguranca', value: ok, critical: true },
    { item_id: '4_6', item_label: 'Treinamento NR-35 vigente (validade 2 anos)',        category: 'EPIs e Seguranca', value: ok, critical: true  },
  ];

  if (result === 'reprovado') {
    all.find(i => i.item_id === '2_2').value = fail;
    all.find(i => i.item_id === '2_2').observation = 'Guarda-corpo superior ausente no tramo norte';
    all.find(i => i.item_id === '1_7').value = fail;
    all.find(i => i.item_id === '1_7').observation = 'Rodape ausente no lado oeste da plataforma';
    all.find(i => i.item_id === '1_4').value = warn;
    all.find(i => i.item_id === '1_4').observation = 'Corrosao superficial em tubo montante';
  } else if (result === 'aprovado_com_ressalvas') {
    all.find(i => i.item_id === '1_7').value = warn;
    all.find(i => i.item_id === '1_7').observation = 'Rodape sem pintura amarela de sinalizacao NR-18';
    all.find(i => i.item_id === '2_1').value = warn;
    all.find(i => i.item_id === '2_1').observation = 'Mola do alcapao com folga — substituir';
  }

  return all;
}

const inspections = [
  {
    id: 'insp_01',
    scaffold_id: 'sc_01', scaffold_code: 'AND-2026-0001',
    date: new Date('2026-06-04'),
    inspector_name: 'Carlos Henrique Matos',
    result: 'aprovado', validity_days: 30,
    notes: 'Andaime em conformidade total. Todas as travas verificadas. Carga maxima sinalizada.',
    checklist: checklistCompleto('aprovado'),
  },
  {
    id: 'insp_02',
    scaffold_id: 'sc_01', scaffold_code: 'AND-2026-0001',
    date: new Date('2026-05-05'),
    inspector_name: 'Carlos Henrique Matos',
    result: 'aprovado_com_ressalvas', validity_days: 30,
    notes: 'Rodape sem sinalizacao. Solicitado reparo antes da proxima inspecao.',
    checklist: checklistCompleto('aprovado_com_ressalvas'),
  },
  {
    id: 'insp_03',
    scaffold_id: 'sc_03', scaffold_code: 'AND-2026-0003',
    date: new Date('2026-06-02'),
    inspector_name: 'Joao Raimundo Silva',
    result: 'reprovado', validity_days: 0,
    notes: 'Guarda-corpo superior ausente. Rodape faltando. Corrosao em montante. INTERDITAR.',
    checklist: checklistCompleto('reprovado'),
  },
  {
    id: 'insp_04',
    scaffold_id: 'sc_05', scaffold_code: 'AND-2026-0005',
    date: new Date('2026-06-01'),
    inspector_name: 'Fernanda Cristina Rocha',
    result: 'aprovado', validity_days: 30,
    notes: 'Andaime suspenso inspecionado. Ancoragens e dispositivos de seguranca OK.',
    checklist: checklistCompleto('aprovado'),
  },
  {
    id: 'insp_05',
    scaffold_id: 'sc_06', scaffold_code: 'AND-2026-0006',
    date: new Date('2026-04-20'),
    inspector_name: 'Roberto Alves Nunes',
    result: 'aprovado_com_ressalvas', validity_days: 30,
    notes: 'Alcapao com mola frouxa. Uso restrito a inspecao visual.',
    checklist: checklistCompleto('aprovado_com_ressalvas'),
  },
  {
    id: 'insp_06',
    scaffold_id: 'sc_08', scaffold_code: 'AND-2026-0008',
    date: new Date('2026-05-29'),
    inspector_name: 'Luis Fernando Braga',
    result: 'aprovado', validity_days: 30,
    notes: 'Inspecao pre-uso executada. Documentacao completa. Liberado para manutencao.',
    checklist: checklistCompleto('aprovado'),
  },
  {
    id: 'insp_07',
    scaffold_id: 'sc_09', scaffold_code: 'AND-2026-0009',
    date: new Date('2026-06-03'),
    inspector_name: 'Antonio Carlos Figueiredo',
    result: 'reprovado', validity_days: 0,
    notes: 'Guarda-corpo com folga critica. Risco de colapso parcial. INTERDITADO.',
    checklist: checklistCompleto('reprovado'),
  },
];

async function main() {
  console.log('Limpando banco...');
  await prisma.scaffoldDocument.deleteMany();
  await prisma.checklistEntry.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.scaffold.deleteMany();

  console.log('Inserindo andaimes — Hydro Alunorte (Barcarena-PA)...');
  for (const s of scaffolds) {
    await prisma.scaffold.create({ data: s });
  }

  console.log('Inserindo inspecoes e checklist...');
  for (const insp of inspections) {
    const { checklist, ...data } = insp;
    await prisma.inspection.create({
      data: { ...data, checklist: { create: checklist } },
    });
  }

  const sc   = await prisma.scaffold.count();
  const insp = await prisma.inspection.count();
  const cl   = await prisma.checklistEntry.count();

  console.log('');
  console.log('Seed concluido!');
  console.log('  ' + sc + ' andaimes');
  console.log('  ' + insp + ' inspecoes');
  console.log('  ' + cl + ' itens de checklist');
  console.log('  Planta: Hydro Alunorte S.A. — Barcarena, Para, Brasil');
}

main()
  .catch(console.error)
  .finally(() => pool.end());
