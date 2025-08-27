import { pool, query } from '@/config/database';
import { Beneficiaria, BeneficiariaCreateInput, BeneficiariaUpdateInput } from '@/models/beneficiaria.model';

export class BeneficiariaRepository {
    async findById(id: number): Promise<Beneficiaria | null> {
        const result = await query(
            'SELECT * FROM beneficiarias WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    async findByCPF(cpf: string): Promise<Beneficiaria | null> {
        const result = await query(
            'SELECT * FROM beneficiarias WHERE cpf = $1',
            [cpf]
        );
        return result.rows[0] || null;
    }

    async findAll(filters: {
        status?: string,
        nome?: string,
        offset?: number,
        limit?: number
    } = {}): Promise<{ data: Beneficiaria[], total: number }> {
        let whereClause = 'WHERE 1=1';
        const values: any[] = [];
        let paramCount = 1;

        if (filters.status) {
            whereClause += ` AND status = $${paramCount}`;
            values.push(filters.status);
            paramCount += 1;
        }

        if (filters.nome) {
            whereClause += ` AND nome ILIKE $${paramCount}`;
            values.push(`%${filters.nome}%`);
            paramCount += 1;
        }

        const limitClause = filters.limit ? ` LIMIT $${paramCount}` : '';
        if (filters.limit) {
            values.push(filters.limit);
            paramCount += 1;
        }

        const offsetClause = filters.offset ? ` OFFSET $${paramCount}` : '';
        if (filters.offset) {
            values.push(filters.offset);
        }

        const [dataResult, countResult] = await Promise.all([
            query(
                `SELECT * FROM beneficiarias ${whereClause} ORDER BY nome ${limitClause} ${offsetClause}`,
                values
            ),
            query(
                `SELECT COUNT(*) FROM beneficiarias ${whereClause}`,
                values.slice(0, -2) // Remove limit e offset
            )
        ]);

        return {
            data: dataResult.rows,
            total: parseInt(countResult.rows[0].count)
        };
    }

    async create(data: BeneficiariaCreateInput): Promise<Beneficiaria> {
        const result = await query(
            `INSERT INTO beneficiarias (
                nome, cpf, rg, data_nascimento, telefone, telefone_emergencia,
                email, endereco, cidade, estado, cep, escolaridade,
                estado_civil, numero_filhos, renda_familiar, situacao_moradia,
                status, observacoes, usuario_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *`,
            [
                data.nome, data.cpf, data.rg, data.data_nascimento, data.telefone,
                data.telefone_emergencia, data.email, data.endereco, data.cidade,
                data.estado, data.cep, data.escolaridade, data.estado_civil,
                data.numero_filhos, data.renda_familiar, data.situacao_moradia,
                data.status, data.observacoes, data.usuario_id
            ]
        );
        return result.rows[0];
    }

    async update(id: number, data: BeneficiariaUpdateInput): Promise<Beneficiaria | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        Object.keys(data).forEach((key) => {
            if (data[key as keyof BeneficiariaUpdateInput] !== undefined) {
                updates.push(`${key} = $${paramCount}`);
                values.push(data[key as keyof BeneficiariaUpdateInput]);
                paramCount += 1;
            }
        });

        if (updates.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE beneficiarias 
             SET ${updates.join(', ')}
             WHERE id = $${paramCount}
             RETURNING *`,
            values
        );

        return result.rows[0] || null;
    }

    async delete(id: number): Promise<boolean> {
        const result = await query(
            'DELETE FROM beneficiarias WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rowCount > 0;
    }
}
