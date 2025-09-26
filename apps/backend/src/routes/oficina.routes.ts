import express from 'express';
import { OficinaService } from '../services/oficina.service';
import { authenticateToken, requireGestor, authorize } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/responseFormatter';
import { oficinaFilterSchema, createOficinaSchema, updateOficinaSchema } from '../validators/oficina.validator';
import { pool } from '../config/database';
import { OficinaRepository } from '../repositories/OficinaRepository';
import PDFDocument = require('pdfkit');
import ExcelJS = require('exceljs');
import { catchAsync } from '../middleware/errorHandler';

const router = express.Router();

import { redis } from '../lib/redis';
import { loggerService } from '../services/logger';

const oficinaService = new OficinaService(pool, redis);
const oficinaRepository = new OficinaRepository();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// Listar oficinas (público)
router.get('/', authorize('oficinas.ler'), catchAsync(async (req, res): Promise<void> => {
  try {
    const filters = oficinaFilterSchema.parse(req.query);
    const result = await oficinaService.listarOficinas(filters) as any;
    
    res.json(successResponse(
      result,
      "Oficinas carregadas com sucesso"
    ));
    return;
  } catch (error: any) {
    loggerService.error("Get oficinas error:", error);

    if (error.name === 'ZodError') {
      res.status(400).json(errorResponse("Parâmetros de filtro inválidos"));
      return;
    }

    res.status(500).json(errorResponse("Erro ao buscar oficinas"));
    return;
  }
}));

// Horários disponíveis para uma data específica (intervalos de 30 min)
router.get('/horarios-disponiveis', authenticateToken, authorize('oficinas.horarios.listar'), catchAsync(async (req, res): Promise<void> => {
  try {
    const data = String(req.query.data || '');
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      res.status(400).json(errorResponse('Parâmetro "data" (YYYY-MM-DD) é obrigatório'));
      return;
    }

    // Buscar janelas ocupadas neste dia
    const ocupadas = await pool.query(
      `SELECT id, nome, horario_inicio, horario_fim, data_inicio, data_fim, dias_semana
       FROM oficinas o
       WHERE o.ativo = true
         AND o.data_inicio <= $1
         AND (o.data_fim IS NULL OR o.data_fim >= $1)`,
      [data]
    );

    // Geração de slots de 30min entre 08:00 e 20:00
    const startMinutes = 8 * 60; // 08:00
    const endMinutes = 20 * 60; // 20:00
    const step = 30; // 30 minutos

    const toHM = (total: number) => {
      const h = Math.floor(total / 60);
      const m = total % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const busyRanges = ocupadas.rows.map((r: any) => {
      const iniStr = (r?.horario_inicio ? String(r.horario_inicio) : '00:00');
      const fimStr = (r?.horario_fim ? String(r.horario_fim) : '00:00');
      const [ih, im] = iniStr.split(':');
      const [fh, fm] = fimStr.split(':');
      const inicio = (parseInt(ih || '0', 10) * 60) + parseInt(im || '0', 10);
      const fim = (parseInt(fh || '0', 10) * 60) + parseInt(fm || '0', 10);
      return { inicio, fim, nome: r.nome };
    }).filter((r: any) => !isNaN(r.inicio) && !isNaN(r.fim));

    const disponiveis: string[] = [];
    for (let t = startMinutes; t + step <= endMinutes; t += step) {
      const slotInicio = t;
      const slotFim = t + step;
      const overlap = busyRanges.some((b) => !(slotFim <= b.inicio || slotInicio >= b.fim));
      if (!overlap) {
        disponiveis.push(`${toHM(slotInicio)}-${toHM(slotFim)}`);
      }
    }

    res.json(successResponse({ date: data, disponiveis, ocupados: ocupadas.rows }));
    return;
  } catch (error: any) {
    loggerService.error('Horários disponíveis error:', error);
    res.status(500).json(errorResponse('Erro ao calcular horários disponíveis'));
    return;
  }
}));

// Verificar conflito de horários
router.post('/verificar-conflito', authenticateToken, authorize('oficinas.conflito.verificar'), catchAsync(async (req, res): Promise<void> => {
  try {
    const { data_inicio, data_fim, horario_inicio, horario_fim, dias_semana, excluir_oficina_id } = req.body || {};
    if (!data_inicio || !horario_inicio || !horario_fim) {
      res.status(400).json(errorResponse('data_inicio, horario_inicio e horario_fim são obrigatórios'));
      return;
    }

    const params: any[] = [data_inicio, data_fim || data_inicio, horario_inicio, horario_fim];
    let idx = 5;
    let where = `
      o.ativo = true
      AND (
        (o.data_inicio <= $2 AND (o.data_fim IS NULL OR o.data_fim >= $1))
      )
      AND NOT ($4 <= o.horario_inicio OR $3 >= o.horario_fim)
    `;

    if (dias_semana) {
      where += ` AND (o.dias_semana IS NULL OR o.dias_semana ILIKE $${idx++})`;
      params.push(`%${dias_semana}%`);
    }
    if (excluir_oficina_id) {
      where += ` AND o.id <> $${idx++}`;
      params.push(excluir_oficina_id);
    }

    const result = await pool.query(
      `SELECT id, nome, data_inicio, data_fim, horario_inicio, horario_fim, local
       FROM oficinas o
       WHERE ${where}
       LIMIT 20`,
      params
    );

    res.json(successResponse({ conflito: (result.rows?.length || 0) > 0, conflitos: result.rows }));
    return;
  } catch (error: any) {
    loggerService.error('Verificar conflito error:', error);
    res.status(500).json(errorResponse('Erro ao verificar conflito'));
    return;
  }
}));

// Obter oficina específica
router.get('/:id', authorize('oficinas.ler'), catchAsync(async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const oficina = await oficinaService.buscarOficina(id);
    
    res.json(successResponse(oficina, "Oficina carregada com sucesso"));
    return;
  } catch (error: any) {
    loggerService.error("Get oficina error:", error);

    if (error.message === "Oficina não encontrada") {
      res.status(404).json(errorResponse(error.message));
      return;
    }

    res.status(500).json(errorResponse("Erro ao buscar oficina"));
    return;
  }
}));

// Criar oficina
router.post('/', authorize('oficinas.criar'), catchAsync(async (req, res): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json(errorResponse('Não autenticado'));
      return;
    }
    const oficina = await oficinaService.criarOficina(req.body, String(user.id));
    res.status(201).json(successResponse(oficina, "Oficina criada com sucesso"));
    return;
  } catch (error: any) {
    loggerService.error("Create oficina error:", error);

    if (error.name === 'ZodError') {
      res.status(400).json(errorResponse("Dados inválidos para criar oficina"));
      return;
    }

    if (error.message === "Projeto não encontrado") {
      res.status(400).json(errorResponse(error.message));
      return;
    }

    res.status(500).json(errorResponse("Erro ao criar oficina"));
    return;
  }
}));

// Atualizar oficina
router.put('/:id', authorize('oficinas.editar'), catchAsync(async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const user = (req as any).user;
    if (!user) {
      res.status(401).json(errorResponse('Não autenticado'));
      return;
    }
    const oficina = await oficinaService.atualizarOficina(
      id, 
      req.body,
      String(user?.id ?? ''),
      String(user?.role ?? '')
    );
    
    res.json(successResponse(oficina, "Oficina atualizada com sucesso"));
    return;
  } catch (error: any) {
    loggerService.error("Update oficina error:", error);

    if (error.name === 'ZodError') {
      res.status(400).json(errorResponse("Dados inválidos para atualizar oficina"));
      return;
    }

    if (error.message === "Oficina não encontrada") {
      res.status(404).json(errorResponse(error.message));
      return;
    }

    if (error.message === "Projeto não encontrado") {
      res.status(400).json(errorResponse(error.message));
      return;
    }

    if (error.message === "Nenhum campo para atualizar") {
      res.status(400).json(errorResponse(error.message));
      return;
    }

    if (error.message === "Sem permissão para editar esta oficina") {
      res.status(403).json(errorResponse(error.message));
      return;
    }

    res.status(500).json(errorResponse("Erro ao atualizar oficina"));
    return;
  }
}));

// Excluir oficina (soft delete)
router.delete('/:id', authorize('oficinas.excluir'), catchAsync(async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const user = (req as any).user;
    if (!user) {
      res.status(401).json(errorResponse('Não autenticado'));
      return;
    }
    await oficinaService.excluirOficina(id, String(user?.id ?? ''), String(user?.role ?? ''));
    
    res.json(successResponse(null, "Oficina excluída com sucesso"));
    return;
  } catch (error: any) {
    loggerService.error("Delete oficina error:", error);

    if (error.message === "Oficina não encontrada") {
      res.status(404).json(errorResponse(error.message));
      return;
    }

    if (error.message === "Sem permissão para excluir esta oficina") {
      res.status(403).json(errorResponse(error.message));
      return;
    }

    res.status(500).json(errorResponse("Erro ao excluir oficina"));
    return;
  }
}));

// Obter participantes de uma oficina
router.get('/:id/participantes', authenticateToken, authorize('oficinas.participantes.ver'), catchAsync(async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const participantes = await oficinaService.listarParticipantes(id);
    
    res.json(successResponse(participantes, "Participantes carregados com sucesso"));
    return;
  } catch (error: any) {
    loggerService.error("Get participantes error:", error);

    if (error.message === "Oficina não encontrada") {
      res.status(404).json(errorResponse(error.message));
      return;
    }

    res.status(500).json(errorResponse("Erro ao buscar participantes"));
    return;
  }
}));

// Adicionar participante à oficina (mapeia para participação no projeto da oficina)
router.post('/:id/participantes', authenticateToken, requireGestor, authorize('oficinas.participantes.adicionar'), catchAsync(async (req, res): Promise<void> => {
  try {
    const oficinaId = parseInt(String(req.params.id));
    const { beneficiaria_id, observacoes } = req.body || {};
    if (!beneficiaria_id) {
      res.status(400).json(errorResponse('beneficiaria_id é obrigatório'));
      return;
    }

    // Descobrir projeto da oficina
    const of = await pool.query('SELECT projeto_id FROM oficinas WHERE id = $1 AND ativo = true', [oficinaId]);
    if (of.rowCount === 0) { res.status(404).json(errorResponse('Oficina não encontrada')); return; }
    const projetoId = of.rows[0].projeto_id;
    if (!projetoId) { res.status(400).json(errorResponse('Oficina não está vinculada a um projeto')); return; }

    // Verificar se já existe participação ativa
    const exists = await pool.query(
      'SELECT id FROM participacoes WHERE beneficiaria_id = $1 AND projeto_id = $2 AND ativo = true',
      [beneficiaria_id, projetoId]
    );
    if ((exists.rowCount || 0) > 0) {
      res.status(409).json(errorResponse('Beneficiária já participa deste projeto'));
      return;
    }

    const created = await pool.query(
      `INSERT INTO participacoes (beneficiaria_id, projeto_id, status, observacoes)
       VALUES ($1,$2,'inscrita',$3) RETURNING *`,
      [beneficiaria_id, projetoId, observacoes || null]
    );

    res.status(201).json(successResponse(created.rows[0], 'Participante adicionada com sucesso'));
    return;
  } catch (error: any) {
    loggerService.error('Add participante error:', error);
    res.status(500).json(errorResponse('Erro ao adicionar participante'));
    return;
  }
}));

// Remover participante da oficina (soft delete da participação no projeto)
router.delete('/:id/participantes/:beneficiariaId', authenticateToken, requireGestor, authorize('oficinas.participantes.remover'), catchAsync(async (req, res): Promise<void> => {
  try {
    const oficinaId = parseInt(String(req.params.id));
    const beneficiariaId = parseInt(String(req.params.beneficiariaId));

    // Descobrir projeto da oficina
    const of = await pool.query('SELECT projeto_id FROM oficinas WHERE id = $1 AND ativo = true', [oficinaId]);
    if (of.rowCount === 0) { res.status(404).json(errorResponse('Oficina não encontrada')); return; }
    const projetoId = of.rows[0].projeto_id;

    const part = await pool.query(
      'SELECT id FROM participacoes WHERE beneficiaria_id = $1 AND projeto_id = $2 AND ativo = true',
      [beneficiariaId, projetoId]
    );
    if (part.rowCount === 0) { res.status(404).json(errorResponse('Participação não encontrada')); return; }

    await pool.query('UPDATE participacoes SET ativo = false, data_atualizacao = NOW() WHERE id = $1', [part.rows[0].id]);
    res.json(successResponse({ message: 'Participante removida com sucesso' }));
    return;
  } catch (error: any) {
    loggerService.error('Remove participante error:', error);
    res.status(500).json(errorResponse('Erro ao remover participante'));
    return;
  }
}));

// Registrar presença em uma oficina para uma beneficiária
router.post('/:id/presencas', authenticateToken, authorize('oficinas.presencas.registrar'), catchAsync(async (req, res): Promise<void> => {
  try {
    const oficinaId = parseInt(String(req.params.id));
    const { beneficiaria_id, presente, observacoes, data } = req.body || {};
    if (!beneficiaria_id || typeof presente !== 'boolean') {
      res.status(400).json(errorResponse('beneficiaria_id e presente (boolean) são obrigatórios'));
      return;
    }

    let dataEncontro: Date | undefined;
    if (data) {
      const parsed = new Date(data);
      if (Number.isNaN(parsed.getTime())) {
        res.status(400).json(errorResponse('data do encontro inválida'));
        return;
      }
      dataEncontro = parsed;
    }

    const registro = await oficinaRepository.registrarPresenca(
      oficinaId,
      Number(beneficiaria_id),
      !!presente,
      observacoes,
      dataEncontro
    );

    res.status(201).json(successResponse(registro, 'Presença registrada'));
    return;
  } catch (error: any) {
    loggerService.error('Registrar presença error:', error);
    res.status(500).json(errorResponse('Erro ao registrar presença'));
    return;
  }
}));

// Listar presenças de uma oficina (opcionalmente filtrar por data YYYY-MM-DD)
router.get('/:id/presencas', authenticateToken, authorize('oficinas.presencas.listar'), catchAsync(async (req, res): Promise<void> => {
  try {
    const oficinaId = parseInt(String(req.params.id));
    const data = (req.query.data as string) || '';

    let query = `
      SELECT p.*, b.nome_completo as beneficiaria_nome
      FROM oficina_presencas p
      JOIN beneficiarias b ON b.id = p.beneficiaria_id
      WHERE p.oficina_id = $1
    `;
    const params: any[] = [oficinaId];
    if (data) {
      query += ' AND p.data_encontro = $2';
      params.push(data);
    }
    query += ' ORDER BY p.data_encontro DESC, beneficiaria_nome';

    const result = await pool.query(query, params);
    res.json(successResponse(result.rows));
    return;
  } catch (error: any) {
    loggerService.error('Listar presenças error:', error);
    res.status(500).json(errorResponse('Erro ao listar presenças'));
    return;
  }
}));

// Resumo da oficina
router.get('/:id/resumo', authenticateToken, catchAsync(async (req, res): Promise<void> => {
  try {
    const oficinaId = parseInt(String(req.params.id));

    const oficina = await pool.query('SELECT id, projeto_id, vagas_total FROM oficinas WHERE id = $1 AND ativo = true', [oficinaId]);
    if (oficina.rowCount === 0) { res.status(404).json(errorResponse('Oficina não encontrada')); return; }
    const projetoId = oficina.rows[0].projeto_id;

    const [participantes, presencas, presentes] = await Promise.all([
      pool.query('SELECT COUNT(DISTINCT beneficiaria_id)::int as c FROM participacoes WHERE projeto_id = $1 AND ativo = true', [projetoId]),
      pool.query('SELECT COUNT(*)::int as c FROM oficina_presencas WHERE oficina_id = $1', [oficinaId]),
      pool.query('SELECT COUNT(*)::int as c FROM oficina_presencas WHERE oficina_id = $1 AND presente = true', [oficinaId]),
    ]);

    const totalParticipantes = participantes.rows[0].c || 0;
    const totalPresencas = presencas.rows[0].c || 0;
    const totalPresentes = presentes.rows[0].c || 0;
    const taxaMediaPresenca = totalPresencas > 0 ? Math.round((totalPresentes / totalPresencas) * 100) : 0;

    res.json(successResponse({
      total_participantes: totalParticipantes,
      total_presencas: totalPresencas,
      taxa_media_presenca: taxaMediaPresenca,
      vagas_total: oficina.rows[0].vagas_total
    }));
    return;
  } catch (error: any) {
    loggerService.error('Resumo oficina error:', error);
    res.status(500).json(errorResponse('Erro ao obter resumo da oficina'));
    return;
  }
}));


// Relatório de presenças (PDF/Excel)
router.get('/:id/relatorio-presencas', authenticateToken, authorize('oficinas.relatorio.exportar'), catchAsync(async (req, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const formato = String(req.query.formato || 'pdf').toLowerCase();

    const oficina = await pool.query(
      `SELECT id, nome, instrutor, data_inicio, data_fim, horario_inicio, horario_fim, local, projeto_id
       FROM oficinas WHERE id = $1`,
      [id]
    );
    if (oficina.rowCount === 0) {
      res.status(404).json(errorResponse('Oficina não encontrada'));
      return;
    }
    const of = oficina.rows[0];

    // Participantes: por projeto da oficina
    const participantes = await pool.query(
      `SELECT b.id, b.nome_completo
       FROM participacoes p
       JOIN beneficiarias b ON b.id = p.beneficiaria_id
       WHERE p.projeto_id = $1 AND p.ativo = true
       ORDER BY b.nome_completo`,
      [of.projeto_id]
    );

    // Presenças
    const presencas = await pool.query(
      `SELECT beneficiaria_id, presente, data_encontro
       FROM oficina_presencas WHERE oficina_id = $1
       ORDER BY data_encontro ASC, beneficiaria_id ASC`,
      [id]
    );

    // Agregar presenças por beneficiária
    const map = new Map<number, { nome: string; presentes: number; faltas: number; total: number }>();
    for (const p of participantes.rows) {
      map.set(p.id, { nome: p.nome_completo, presentes: 0, faltas: 0, total: 0 });
    }
    for (const r of presencas.rows) {
      if (!map.has(r.beneficiaria_id)) continue;
      const entry = map.get(r.beneficiaria_id)!;
      entry.total += 1;
      if (r.presente) entry.presentes += 1; else entry.faltas += 1;
    }
    const linhas = Array.from(map.entries()).map(([idb, v]) => ({ id: idb, ...v }));

    if (formato === 'xlsx' || formato === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Presenças');
      sheet.columns = [
        { header: 'Beneficiária', key: 'nome', width: 40 },
        { header: 'Presentes', key: 'presentes', width: 12 },
        { header: 'Faltas', key: 'faltas', width: 10 },
        { header: 'Total Registros', key: 'total', width: 16 }
      ];
      sheet.addRow(['Oficina', of.nome, 'Instrutor', of.instrutor || '' ]);
      sheet.addRow(['Data', String(of.data_inicio || ''), 'Horário', `${of.horario_inicio || ''}-${of.horario_fim || ''}` ]);
      sheet.addRow([]);
      linhas.forEach(l => sheet.addRow({ nome: l.nome, presentes: l.presentes, faltas: l.faltas, total: l.total }));
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio_presencas_oficina_${of.nome}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    // PDF default
    const doc = new (PDFDocument as any)({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio_presencas_oficina_${of.nome}.pdf"`);
      res.send(pdf);
    });

    doc.fontSize(18).text(`Relatório de Presenças - ${of.nome}`, { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Instrutor: ${of.instrutor || 'N/A'}`);
    doc.text(`Data: ${String(of.data_inicio || '')}`);
    doc.text(`Horário: ${of.horario_inicio || ''} - ${of.horario_fim || ''}`);
    doc.moveDown();
    doc.text('Participantes:');
    doc.moveDown(0.5);
    linhas.forEach((l, idx) => {
      doc.text(`${idx + 1}. ${l.nome} - Presentes: ${l.presentes} | Faltas: ${l.faltas} | Total: ${l.total}`);
    });
    doc.end();
  } catch (error: any) {
    loggerService.error('Relatório presenças error:', error);
    res.status(500).json(errorResponse('Erro ao gerar relatório de presenças'));
    return;
  }
}));

export default router;
