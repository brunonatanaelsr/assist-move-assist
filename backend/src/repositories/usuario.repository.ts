import { pool, query } from '@/config/database';
import { Usuario, UsuarioCreateInput, UsuarioUpdateInput } from '@/models/usuario.model';

export class UsuarioRepository {
    async findById(id: number): Promise<Usuario | null> {
        const result = await query(
            'SELECT id, email, nome, papel, avatar_url, ultimo_login, criado_em, atualizado_em FROM usuarios WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    async findByEmail(email: string): Promise<Usuario | null> {
        const result = await query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    async create(data: UsuarioCreateInput): Promise<Usuario> {
        const result = await query(
            `INSERT INTO usuarios (email, senha, nome, papel, avatar_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, email, nome, papel, avatar_url, criado_em, atualizado_em`,
            [data.email, data.senha, data.nome, data.papel, data.avatar_url]
        );
        return result.rows[0];
    }

    async update(id: number, data: UsuarioUpdateInput): Promise<Usuario | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        // Construir query dinamicamente
        Object.keys(data).forEach((key) => {
            if (data[key as keyof UsuarioUpdateInput] !== undefined) {
                updates.push(`${key} = $${paramCount}`);
                values.push(data[key as keyof UsuarioUpdateInput]);
                paramCount += 1;
            }
        });

        if (updates.length === 0) return null;

        values.push(id);
        const result = await query(
            `UPDATE usuarios 
             SET ${updates.join(', ')}
             WHERE id = $${paramCount}
             RETURNING id, email, nome, papel, avatar_url, ultimo_login, criado_em, atualizado_em`,
            values
        );

        return result.rows[0] || null;
    }

    async delete(id: number): Promise<boolean> {
        const result = await query(
            'DELETE FROM usuarios WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rowCount > 0;
    }

    async updateLastLogin(id: number): Promise<void> {
        await query(
            'UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );
    }
}
