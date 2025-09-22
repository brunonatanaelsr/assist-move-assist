import { Pool, PoolClient, QueryResult as PgQueryResult, QueryResultRow } from 'pg';
import type Redis from 'ioredis';

export type RedisFunction<T> = jest.Mock<Promise<T>>;

export interface RedisService {
  get: RedisFunction<string | null>;
  set: RedisFunction<'OK'>;
  setex: RedisFunction<'OK'>;
  del: RedisFunction<number>;
  expire: RedisFunction<number>;
}

export interface QueryFunctionResult extends QueryResultRow {
  id?: number;
  nome?: string;
  descricao?: string;
  instrutor?: string;
  data_inicio?: string;
  data_fim?: string;
  horario_inicio?: string;
  horario_fim?: string;
  local?: string;
  vagas_total?: number;
  projeto_id?: number;
  responsavel_id?: string;
  status?: string;
  ativo?: boolean;
  data_criacao?: string;
  data_atualizacao?: string;
  total_count?: string;
}

export type QueryFunction = (...args: any[]) => Promise<PgQueryResult<QueryFunctionResult>>;

export interface PoolType extends Pool {
  query: QueryFunction & jest.Mock;
}

export type PoolClientType = PoolClient;

export interface Oficina extends QueryResultRow {
  id: number;
  nome: string;
  descricao: string;
  instrutor: string;
  data_inicio: string;
  data_fim: string; 
  horario_inicio: string;
  horario_fim: string;
  local: string;
  vagas_total: number;
  projeto_id: number;
  responsavel_id: string;
  status: string;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
  total_count?: string;
}

export interface Participante extends QueryResultRow {
  id: number;
  nome_completo: string;
  data_inscricao: Date;
}

export interface QueryResult<T extends QueryResultRow> extends PgQueryResult<T> {
  rows: T[];
}
