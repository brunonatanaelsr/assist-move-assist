import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreatePerfilPermissaoTables1629900000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Criar enum para ações de permissão
        await queryRunner.query(`
            CREATE TYPE acao_permissao AS ENUM (
                'CREATE', 'READ', 'UPDATE', 'DELETE',
                'MANAGE_ATTENDANCE', 'MODERATE', 'APPROVE'
            );
        `);

        // Criar tabela perfis
        await queryRunner.createTable(new Table({
            name: "perfis",
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "nome",
                    type: "varchar",
                    length: "50"
                },
                {
                    name: "descricao",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                }
            ]
        }));

        // Criar tabela permissoes
        await queryRunner.createTable(new Table({
            name: "permissoes",
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "nome",
                    type: "varchar"
                },
                {
                    name: "descricao",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "recurso",
                    type: "varchar"
                },
                {
                    name: "acao",
                    type: "acao_permissao"
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                }
            ]
        }));

        // Criar tabela de relacionamento perfil_permissoes
        await queryRunner.createTable(new Table({
            name: "perfil_permissoes",
            columns: [
                {
                    name: "perfil_id",
                    type: "int"
                },
                {
                    name: "permissao_id",
                    type: "int"
                }
            ]
        }));

        // Adicionar foreign keys
        await queryRunner.createForeignKey("perfil_permissoes", new TableForeignKey({
            columnNames: ["perfil_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "perfis",
            onDelete: "CASCADE"
        }));

        await queryRunner.createForeignKey("perfil_permissoes", new TableForeignKey({
            columnNames: ["permissao_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "permissoes",
            onDelete: "CASCADE"
        }));

        // Inserir perfis iniciais
        await queryRunner.query(`
            INSERT INTO perfis (nome, descricao) VALUES
            ('Admin', 'Acesso total ao sistema'),
            ('Coordenador', 'Gerenciamento de atividades e usuários'),
            ('Participante', 'Acesso básico ao sistema');
        `);

        // Inserir permissões iniciais
        await queryRunner.query(`
            INSERT INTO permissoes (nome, recurso, acao) VALUES
            ('Criar Usuários', 'usuarios', 'CREATE'),
            ('Visualizar Usuários', 'usuarios', 'READ'),
            ('Editar Usuários', 'usuarios', 'UPDATE'),
            ('Excluir Usuários', 'usuarios', 'DELETE'),
            
            ('Criar Oficinas', 'oficinas', 'CREATE'),
            ('Visualizar Oficinas', 'oficinas', 'READ'),
            ('Editar Oficinas', 'oficinas', 'UPDATE'),
            ('Excluir Oficinas', 'oficinas', 'DELETE'),
            ('Gerenciar Presenças', 'oficinas', 'MANAGE_ATTENDANCE'),
            
            ('Enviar Mensagens', 'mensagens', 'CREATE'),
            ('Ler Mensagens', 'mensagens', 'READ'),
            ('Editar Mensagens', 'mensagens', 'UPDATE'),
            ('Excluir Mensagens', 'mensagens', 'DELETE'),
            ('Moderar Mensagens', 'mensagens', 'MODERATE'),
            
            ('Criar Planejamento', 'planejamento', 'CREATE'),
            ('Visualizar Planejamento', 'planejamento', 'READ'),
            ('Editar Planejamento', 'planejamento', 'UPDATE'),
            ('Excluir Planejamento', 'planejamento', 'DELETE'),
            ('Aprovar Planejamento', 'planejamento', 'APPROVE');
        `);

        // Atribuir todas as permissões ao perfil Admin
        await queryRunner.query(`
            INSERT INTO perfil_permissoes (perfil_id, permissao_id)
            SELECT 1, id FROM permissoes;
        `);

        // Atribuir permissões básicas ao perfil Coordenador
        await queryRunner.query(`
            INSERT INTO perfil_permissoes (perfil_id, permissao_id)
            SELECT 2, id FROM permissoes 
            WHERE acao IN ('READ', 'CREATE', 'UPDATE', 'MANAGE_ATTENDANCE');
        `);

        // Atribuir permissões básicas ao perfil Participante
        await queryRunner.query(`
            INSERT INTO perfil_permissoes (perfil_id, permissao_id)
            SELECT 3, id FROM permissoes 
            WHERE acao = 'READ';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("perfil_permissoes");
        await queryRunner.dropTable("permissoes");
        await queryRunner.dropTable("perfis");
        await queryRunner.query(`DROP TYPE acao_permissao;`);
    }
}
