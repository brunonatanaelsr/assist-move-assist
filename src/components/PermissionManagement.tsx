import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Switch,
  message,
  Tabs
} from 'antd';
import { MODULOS, ModuloSistema, UserPermission } from '../types/usuarios';
import { supabase } from '../lib/supabaseClient';

const { TabPane } = Tabs;

interface PermissionManagementProps {
  userId: string;
  userRole: string;
}

export const PermissionManagement: React.FC<PermissionManagementProps> = ({
  userId,
  userRole
}) => {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar permissões do usuário
  const loadPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      // Se não houver permissões, criar padrão
      if (!data || data.length === 0) {
        const defaultPermissions = MODULOS.map(modulo => ({
          modulo,
          acoes: {
            ler: true,
            criar: userRole === 'admin',
            editar: userRole === 'admin',
            excluir: userRole === 'admin'
          }
        }));
        setPermissions(defaultPermissions);
      } else {
        setPermissions(data.map(p => ({
          modulo: p.modulo,
          acoes: p.acoes
        })));
      }
    } catch (error) {
      message.error('Erro ao carregar permissões');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, [userId]);

  // Atualizar permissão
  const handlePermissionChange = async (
    modulo: ModuloSistema,
    acao: keyof UserPermission['acoes'],
    value: boolean
  ) => {
    try {
      setLoading(true);
      const updatedPermissions = permissions.map(p =>
        p.modulo === modulo
          ? { ...p, acoes: { ...p.acoes, [acao]: value } }
          : p
      );

      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          modulo,
          acoes: updatedPermissions.find(p => p.modulo === modulo)?.acoes
        });

      if (error) throw error;

      setPermissions(updatedPermissions);
      message.success('Permissão atualizada com sucesso');
    } catch (error) {
      message.error('Erro ao atualizar permissão');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Módulo',
      dataIndex: 'modulo',
      key: 'modulo'
    },
    {
      title: 'Ler',
      key: 'ler',
      render: (record: UserPermission) => (
        <Switch
          checked={record.acoes.ler}
          onChange={(checked) => 
            handlePermissionChange(record.modulo as ModuloSistema, 'ler', checked)
          }
          disabled={loading || userRole !== 'admin'}
        />
      )
    },
    {
      title: 'Criar',
      key: 'criar',
      render: (record: UserPermission) => (
        <Switch
          checked={record.acoes.criar}
          onChange={(checked) => 
            handlePermissionChange(record.modulo as ModuloSistema, 'criar', checked)
          }
          disabled={loading || userRole !== 'admin'}
        />
      )
    },
    {
      title: 'Editar',
      key: 'editar',
      render: (record: UserPermission) => (
        <Switch
          checked={record.acoes.editar}
          onChange={(checked) => 
            handlePermissionChange(record.modulo as ModuloSistema, 'editar', checked)
          }
          disabled={loading || userRole !== 'admin'}
        />
      )
    },
    {
      title: 'Excluir',
      key: 'excluir',
      render: (record: UserPermission) => (
        <Switch
          checked={record.acoes.excluir}
          onChange={(checked) => 
            handlePermissionChange(record.modulo as ModuloSistema, 'excluir', checked)
          }
          disabled={loading || userRole !== 'admin'}
        />
      )
    }
  ];

  return (
    <Card title="Gerenciamento de Permissões">
      <Table
        loading={loading}
        dataSource={permissions}
        columns={columns}
        rowKey="modulo"
        pagination={false}
      />
    </Card>
  );
};
