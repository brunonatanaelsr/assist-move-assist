import { z } from 'src/openapi/init';
import type {
  CreateOficinaDTO,
  Oficina,
  OficinaFormValues,
  OficinaResumo,
  OficinaStatus,
} from '@/types/oficinas';

const statusEnum = z.enum(['ativa', 'inativa', 'pausada', 'concluida']);

const oficinaFormSchema = z.object({
  nome: z.string().trim().min(1, 'Por favor, informe o nome da oficina'),
  descricao: z.string().optional(),
  instrutor: z.string().optional(),
  data_inicio: z.string().min(1, 'Informe a data de início'),
  data_fim: z.string().optional(),
  horario_inicio: z.string().min(1, 'Informe o horário de início'),
  horario_fim: z.string().min(1, 'Informe o horário de fim'),
  local: z.string().optional(),
  vagas_total: z.coerce.number().int().positive('O número de vagas deve ser maior que zero'),
  status: statusEnum,
  projeto_id: z.union([z.string(), z.number()]).optional().default('none'),
  dias_semana: z.string().optional(),
});

export type OficinaValidationResult =
  | { success: true; payload: CreateOficinaDTO }
  | { success: false; message: string };

const normalizeOptional = (value?: string | null) => {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const parseProjetoId = (value?: string | number): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (value === '' || value === 'none') return undefined;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? undefined : numeric;
};

export const validateAndNormalizeOficina = (
  formValues: OficinaFormValues
): OficinaValidationResult => {
  const result = oficinaFormSchema.safeParse(formValues);

  if (!result.success) {
    const firstError = result.error.errors[0]?.message ?? 'Dados inválidos';
    return { success: false, message: firstError };
  }

  const values = result.data;

  if (values.horario_inicio >= values.horario_fim) {
    return {
      success: false,
      message: 'O horário de início deve ser anterior ao horário de fim',
    };
  }

  if (values.data_fim && values.data_inicio > values.data_fim) {
    return {
      success: false,
      message: 'A data de início deve ser anterior à data de fim',
    };
  }

  const payload: CreateOficinaDTO = {
    nome: values.nome,
    descricao: normalizeOptional(values.descricao) ?? null,
    instrutor: normalizeOptional(values.instrutor) ?? null,
    data_inicio: values.data_inicio,
    data_fim: normalizeOptional(values.data_fim) ?? null,
    horario_inicio: values.horario_inicio,
    horario_fim: values.horario_fim,
    local: normalizeOptional(values.local) ?? null,
    vagas_total: values.vagas_total,
    dias_semana: normalizeOptional(values.dias_semana) ?? null,
    status: values.status,
  };

  const projetoId = parseProjetoId(values.projeto_id);
  if (projetoId !== undefined) {
    payload.projeto_id = projetoId;
  }

  return { success: true, payload };
};

export const formatDateForInput = (isoDate?: string | null): string => {
  if (!isoDate) return '';
  const [datePart] = isoDate.split('T');
  return datePart ?? '';
};

export const mapOficinaToFormValues = (oficina: Oficina): OficinaFormValues => ({
  nome: oficina.nome,
  descricao: oficina.descricao ?? '',
  instrutor: oficina.instrutor ?? '',
  data_inicio: formatDateForInput(oficina.data_inicio),
  data_fim: formatDateForInput(oficina.data_fim ?? undefined),
  horario_inicio: oficina.horario_inicio,
  horario_fim: oficina.horario_fim,
  local: oficina.local ?? '',
  vagas_total: oficina.vagas_total,
  status: oficina.status,
  projeto_id: oficina.projeto_id ? oficina.projeto_id.toString() : 'none',
  dias_semana: oficina.dias_semana ?? '',
});

export const getOficinaStatusMetadata = (
  status: OficinaStatus,
  vagasTotal: number,
  vagasOcupadas?: number | null
): { badgeClass: string; label: string } => {
  const ocupadas = vagasOcupadas ?? 0;

  if (status === 'inativa' || status === 'pausada') {
    return { badgeClass: 'bg-red-100 text-red-800', label: status === 'inativa' ? 'Inativa' : 'Pausada' };
  }

  if (status === 'concluida') {
    return { badgeClass: 'bg-primary/10 text-primary', label: 'Concluída' };
  }

  if (status === 'ativa' && ocupadas >= vagasTotal) {
    return { badgeClass: 'bg-orange-100 text-orange-800', label: 'Lotada' };
  }

  return { badgeClass: 'bg-green-100 text-green-800', label: 'Ativa' };
};

export const getVagasDisponiveis = (vagasTotal: number, vagasOcupadas?: number | null): number => {
  return Math.max(0, vagasTotal - (vagasOcupadas ?? 0));
};

export const resumoIndicators = (resumo?: OficinaResumo | null) => {
  if (!resumo) return [] as Array<{ label: string; value: string }>;
  const indicators: Array<{ label: string; value: string }> = [];

  if (typeof resumo.total_participantes === 'number') {
    indicators.push({ label: 'Participantes', value: resumo.total_participantes.toString() });
  }
  if (typeof resumo.taxa_ocupacao === 'number') {
    indicators.push({ label: 'Ocupação', value: `${Math.round(resumo.taxa_ocupacao * 100)}%` });
  }
  if (typeof resumo.presenca_media === 'number') {
    indicators.push({ label: 'Presença média', value: `${Math.round(resumo.presenca_media * 100)}%` });
  }
  if (typeof resumo.encontros_realizados === 'number') {
    indicators.push({ label: 'Encontros', value: resumo.encontros_realizados.toString() });
  }
  if (resumo.proximo_encontro) {
    indicators.push({ label: 'Próximo encontro', value: resumo.proximo_encontro });
  }

  return indicators;
};

export const initialOficinaFormValues: OficinaFormValues = {
  nome: '',
  descricao: '',
  instrutor: '',
  data_inicio: '',
  data_fim: '',
  horario_inicio: '',
  horario_fim: '',
  local: '',
  vagas_total: 20,
  status: 'ativa',
  projeto_id: 'none',
  dias_semana: '',
};

export const normalizeResumoDate = (resumo?: OficinaResumo | null): OficinaResumo | null => {
  if (!resumo) return null;
  if (!resumo.proximo_encontro) return resumo;
  return {
    ...resumo,
    proximo_encontro: formatDateForInput(resumo.proximo_encontro),
  };
};

export { oficinaFormSchema };
