import { Request, Response } from 'express';
import { redis } from '../lib/redis';
import { validate_cpf } from '../utils/cpf-validator';
import { logger } from '../services/logger';
import { ValidationError } from '../utils';
import { BeneficiariasService } from '../services/beneficiarias.service';
import { pool } from '../config/database';

export class ValidationController {
  private readonly CACHE_TTL = 60 * 5; // 5 minutos
  constructor(
    private readonly searchService: BeneficiariasService = new BeneficiariasService(pool, redis)
  ) {}

  async validateCpf(req: Request, res: Response) {
    const { cpf } = req.body;

    try {
      // Verificar cache
      const cacheKey = `validation:cpf:${cpf}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return res.json({ isValid: cached === 'true' });
      }

      // Validar CPF
      const isValid = validate_cpf(cpf);
      
      // Salvar no cache
      await redis.setex(cacheKey, this.CACHE_TTL, isValid.toString());

      return res.json({ isValid });

    } catch (error) {
      logger.error('Erro ao validar CPF', { 
        cpf,
        error: error.message
      });
      
      throw new ValidationError('Erro ao validar CPF');
    }
  }

  async validateEmail(req: Request, res: Response) {
    const { email } = req.body;

    try {
      // Verificar formato básico
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.json({ isValid: false });
      }

      // Verificar MX record (opcional)
      const [domain] = email.split('@').slice(-1);
      
      // Verificar domínio temporário
      const disposableEmails = [
        'tempmail.com',
        'guerrillamail.com',
        // Adicionar outros domínios temporários
      ];

      const isDisposable = disposableEmails.some(d => domain.includes(d));
      
      return res.json({ 
        isValid: !isDisposable,
        warnings: isDisposable ? ['Email temporário não permitido'] : []
      });

    } catch (error) {
      logger.error('Erro ao validar email', {
        email,
        error: error.message
      });
      
      throw new ValidationError('Erro ao validar email');
    }
  }

  async validateTelefone(req: Request, res: Response) {
    const { telefone } = req.body;
    const cleanPhone = telefone.replace(/\D/g, '');

    try {
      // Validar formato
      if (!/^[1-9]{2}9?[0-9]{8}$/.test(cleanPhone)) {
        return res.json({ 
          isValid: false,
          error: 'Formato inválido'
        });
      }

      // Validar DDD
      const ddd = cleanPhone.substring(0, 2);
      const validDDDs = [
        '11', '12', '13', '14', '15', '16', '17', '18', '19',
        '21', '22', '24', '27', '28',
        '31', '32', '33', '34', '35', '37', '38',
        '41', '42', '43', '44', '45', '46', '47', '48', '49',
        '51', '53', '54', '55',
        '61', '62', '63', '64', '65', '66', '67', '68', '69',
        '71', '73', '74', '75', '77', '79',
        '81', '82', '83', '84', '85', '86', '87', '88', '89',
        '91', '92', '93', '94', '95', '96', '97', '98', '99'
      ];

      if (!validDDDs.includes(ddd)) {
        return res.json({
          isValid: false,
          error: 'DDD inválido'
        });
      }

      return res.json({ isValid: true });

    } catch (error) {
      logger.error('Erro ao validar telefone', {
        telefone,
        error: error.message
      });
      
      throw new ValidationError('Erro ao validar telefone');
    }
  }

  async searchBeneficiarias(req: Request, res: Response) {
    const { query } = req.query;
    
    if (typeof query !== 'string' || query.length < 3) {
      throw new ValidationError('Termo de busca deve ter no mínimo 3 caracteres');
    }

    try {
      // Buscar do cache primeiro
      const cacheKey = `search:${query}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // Executar busca no banco
      const results = await this.searchService.searchBeneficiarias(query);
      
      // Cachear resultados
      await redis.setex(cacheKey, 60, JSON.stringify(results));

      return res.json(results);

    } catch (error) {
      logger.error('Erro na busca de beneficiárias', {
        query,
        error: error.message
      });
      
      throw new ValidationError('Erro ao realizar busca');
    }
  }
}
