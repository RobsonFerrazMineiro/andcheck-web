const js = `
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const scaffolds = [
  {
    id: 'sc_01', code: 'AND-001', tag: 'sc_01',
    type: 'tubular', status: 'liberado',
    location: 'Coluna K7 - Nível 2', area: 'Bloco Industrial 01',
    height: 8.5, width: 2.0, length: 6.0, max_load: 300,
    responsible: 'Carlos Mendes',
    validity_date: new Date('2026-06-15'),
  },
  {
    id: 'sc_02', code: 'AND-002', tag: 'sc_02',
    type: 'fachadeiro', status: 'pendente',
    location: 'Fachada Norte - Eixo 3', area: 'Bloco Industrial 02',
    height: 12.0, width: 3.0, length: 10.0, max_load: 250,
    responsible: 'Ana Lima',
    validity_date: null,
  },
  {
    id: 'sc_03', code: 'AND-003', tag: 'sc_03',
    type: 'multidirecional', status: 'reprovado',
    location: 'Torre de Resfriamento TR-02', area: 'Utilidades',
    height: 6.0, width: 1.5, length: 4.0, max_load: 200,
    responsible: 'João Silva',
    validity_date: null,
  },
  {
    id: 'sc_04', code: 'AND-004', tag: 'sc_04',
    type: 'tubular', status: 'em_montagem',
    location: 'Área de Manutenção MEC-04', area: 'Manutencao',
    height: 5.0, width: 2.0, length: 3.0, max_load: 300,
    responsible: 'Pedro Costa',
    validity_date: null,
  },
  {
    id: 'sc_05', code: 'AND-005', tag: 'sc_05',
    type: 'suspenso', status: 'liberado',
    location: 'Silo de Grãos SG-01', area: 'Logistica',
    height: 15.0, width: 1.2, length: 8.0, max_load: 150,
    responsible: 'Fernanda Rocha',
    validity_date: new Date('2026-07-01'),
  },
  {
    id: 'sc_06', code: 'AND-006', tag: 'sc_06',
    type: 'torre', status: 'liberado',
    location: 'Chaminé Principal CH-01', area: 'Processo',
    height: 20.0, width: 2.5, length: 2.5, max_load: 500,
    responsible: 'Roberto Alves',
    validity_date: new Date('2026-05-20'),
  },
  {
    id: 'sc_07', code: 'AND-007', tag: 'sc_07',
    type: 'tubular', status: 'pendente',
    location: 'Subestação Elétrica SE-03', area: 'Utilidades',
    height: 4.0, width: 1.5, length: 3.0, max_load: 300,
    responsible: 'Mariana Souza',
    validity_date: null,
  },
];

const inspections = [
  {
    id: 'insp_01',
    scaffold_id: 'sc_01', scaffold_code: 'AND-001',
    date: new Date('2026-05-10'),
    inspector_name: 'Carlos Mendes',
    result: 'aprovado',
    validity_days: 30,
    notes: 'Andaime em perfeitas condições.',
    checklist: [
      { item_id: 'ITEM_01', item_label: 'Prumo e nivelamento', category: 'Estrutura', value: 'CL_OK',   critical: false },
      { item_id: 'ITEM_02', item_label: 'Fixação das travessas', category: 'Estrutura', value: 'CL_OK', critical: true },
      { item_id: 'ITEM_03', item_label: 'Guarda-corpo superior', category: 'Proteção',  value: 'CL_OK', critical: true },
      { item_id: 'ITEM_04', item_label: 'Rodapé',               category: 'Proteção',  value: 'CL_OK', critical: false },
      { item_id: 'ITEM_05', item_label: 'Plataforma de trabalho',category: 'Proteção',  value: 'CL_OK', critical: true },
    ],
  },
  {
    id: 'insp_02',
    scaffold_id: 'sc_03', scaffold_code: 'AND-003',
    date: new Date('2026-05-08'),
    inspector_name: 'João Silva',
    result: 'reprovado',
    validity_days: 0,
    notes: 'Guarda-corpo com folga. Interditar imediatamente.',
    checklist: [
      { item_id: 'ITEM_01', item_label: 'Prumo e nivelamento',  category: 'Estrutura', value: 'CL_OK',   critical: false },
      { item_id: 'ITEM_02', item_label: 'Fixação das travessas',category: 'Estrutura', value: 'CL_WARN',  critical: true },
      { item_id: 'ITEM_03', item_label: 'Guarda-corpo superior',category: 'Proteção',  value: 'CL_FAIL',  critical: true, observation: 'Folga de 15cm no tramo norte' },
      { item_id: 'ITEM_04', item_label: 'Rodapé',               category: 'Proteção',  value: 'CL_FAIL',  critical: false, observation: 'Rodapé ausente no lado oeste' },
      { item_id: 'ITEM_05', item_label: 'Plataforma de trabalho',category: 'Proteção', value: 'CL_OK',   critical: true },
    ],
  },
  {
    id: 'insp_03',
    scaffold_id: 'sc_05', scaffold_code: 'AND-005',
    date: new Date('2026-05-15'),
    inspector_name: 'Fernanda Rocha',
    result: 'aprovado_com_ressalvas',
    validity_days: 15,
    notes: 'Aprovado com ressalva de pintura de sinalização.',
    checklist: [
      { item_id: 'ITEM_01', item_label: 'Prumo e nivelamento',  category: 'Estrutura', value: 'CL_OK',   critical: false },
      { item_id: 'ITEM_02', item_label: 'Fixação das travessas',category: 'Estrutura', value: 'CL_OK',   critical: true },
      { item_id: 'ITEM_03', item_label: 'Guarda-corpo superior',category: 'Proteção',  value: 'CL_OK',   critical: true },
      { item_id: 'ITEM_04', item_label: 'Rodapé',               category: 'Proteção',  value: 'CL_WARN',  critical: false, observation: 'Rodapé sem pintura amarela de sinalização' },
      { item_id: 'ITEM_05', item_label: 'Plataforma de trabalho',category: 'Proteção', value: 'CL_OK',   critical: true },
    ],
  },
  {
    id: 'insp_04',
    scaffold_id: 'sc_06', scaffold_code: 'AND-006',
    date: new Date('2026-04-20'),
    inspector_name: 'Roberto Alves',
    result: 'aprovado',
    validity_days: 30,
    notes: null,
    checklist: [
      { item_id: 'ITEM_01', item_label: 'Prumo e nivelamento',  category: 'Estrutura', value: 'CL_OK', critical: false },
      { item_id: 'ITEM_02', item_label: 'Fixação das travessas',category: 'Estrutura', value: 'CL_OK', critical: true },
      { item_id: 'ITEM_03', item_label: 'Guarda-corpo superior',category: 'Proteção',  value: 'CL_OK', critical: true },
      { item_id: 'ITEM_05', item_label: 'Plataforma de trabalho',category: 'Proteção', value: 'CL_OK', critical: true },
    ],
  },
  {
    id: 'insp_05',
    scaffold_id: 'sc_01', scaffold_code: 'AND-001',
    date: new Date('2026-04-05'),
    inspector_name: 'Carlos Mendes',
    result: 'aprovado_com_ressalvas',
    validity_days: 30,
    notes: 'Parafuso de fixação desgastado — substituir até próxima inspeção.',
    checklist: [
      { item_id: 'ITEM_01', item_label: 'Prumo e nivelamento',  category: 'Estrutura', value: 'CL_OK',  critical: false },
      { item_id: 'ITEM_02', item_label: 'Fixação das travessas',category: 'Estrutura', value: 'CL_WARN', critical: true, observation: 'Parafuso inferior desgastado' },
      { item_id: 'ITEM_03', item_label: 'Guarda-corpo superior',category: 'Proteção',  value: 'CL_OK',  critical: true },
      { item_id: 'ITEM_05', item_label: 'Plataforma de trabalho',category: 'Proteção', value: 'CL_OK',  critical: true },
    ],
  },
  {
    id: 'insp_06',
    scaffold_id: 'sc_02', scaffold_code: 'AND-002',
    date: new Date('2026-05-20'),
    inspector_name: 'Ana Lima',
    result: 'reprovado',
    validity_days: 0,
    notes: 'Base sem sapata niveladora.',
    checklist: [
      { item_id: 'ITEM_01', item_label: 'Prumo e nivelamento',  category: 'Estrutura', value: 'CL_FAIL', critical: false, observation: 'Base sem sapata niveladora' },
      { item_id: 'ITEM_02', item_label: 'Fixação das travessas',category: 'Estrutura', value: 'CL_OK',   critical: true },
      { item_id: 'ITEM_03', item_label: 'Guarda-corpo superior',category: 'Proteção',  value: 'CL_OK',   critical: true },
    ],
  },
  {
    id: 'insp_07',
    scaffold_id: 'sc_07', scaffold_code: 'AND-007',
    date: new Date('2026-05-25'),
    inspector_name: 'Mariana Souza',
    result: 'aprovado',
    validity_days: 30,
    notes: null,
    checklist: [
      { item_id: 'ITEM_01', item_label: 'Prumo e nivelamento',  category: 'Estrutura', value: 'CL_OK', critical: false },
      { item_id: 'ITEM_03', item_label: 'Guarda-corpo superior',category: 'Proteção',  value: 'CL_OK', critical: true },
      { item_id: 'ITEM_05', item_label: 'Plataforma de trabalho',category: 'Proteção', value: 'CL_OK', critical: true },
    ],
  },
];

async function main() {
  console.log('Limpando banco...');
  await prisma.checklistEntry.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.scaffold.deleteMany();

  console.log('Inserindo andaimes...');
  for (const s of scaffolds) {
    await prisma.scaffold.create({ data: s });
  }

  console.log('Inserindo inspeções e checklist...');
  for (const insp of inspections) {
    const { checklist, ...data } = insp;
    await prisma.inspection.create({
      data: {
        ...data,
        checklist: { create: checklist },
      },
    });
  }

  const sc = await prisma.scaffold.count();
  const insp = await prisma.inspection.count();
  const cl = await prisma.checklistEntry.count();
  console.log('Seed concluído:', sc, 'andaimes,', insp, 'inspeções,', cl, 'itens de checklist');
}

main()
  .catch(console.error)
  .finally(() => pool.end());
`;

require("fs").writeFileSync("prisma/seed.cjs", js.trim());
console.log("seed.cjs escrito");
