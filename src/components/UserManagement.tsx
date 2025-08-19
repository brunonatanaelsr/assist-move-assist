import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Switch,
  Popconfirm
} from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons';
import { useForm } from 'antd/lib/form/Form';
import { UserFormData, PAPEIS, PapelSistema } from '../types/usuarios';
import { supabase } from '../lib/supabaseClient';

const { Option } = Select;

interface UserManagementProps {
  onRefresh?: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onRefresh }) => {
  const [form] = useForm();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Carregar usuários
  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('data_criacao', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      message.error('Erro ao carregar usuários');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Manipular criação/edição de usuário
  const handleSubmit = async (values: UserFormData) => {
    try {
      setLoading(true);
      
      if (editingUser) {
        // Atualizar usuário existente
        const { error } = await supabase
          .from('profiles')
          .update({
            nome: values.nome,
            email: values.email,
            telefone: values.telefone,
            papel: values.papel,
            data_atualizacao: new Date()
          })
          .eq('id', editingUser.id);

        if (error) throw error;
        message.success('Usuário atualizado com sucesso');
      } else {
        // Criar novo usuário
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: values.email,
          password: values.senha!
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              nome: values.nome,
              email: values.email,
              telefone: values.telefone,
              papel: values.papel,
              ativo: true,
              data_criacao: new Date()
            });

          if (profileError) throw profileError;
          message.success('Usuário criado com sucesso');
        }
      }

      setModalVisible(false);
      form.resetFields();
      loadUsers();
      onRefresh?.();
    } catch (error) {
      message.error('Erro ao salvar usuário');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Manipular desativação de usuário
  const handleToggleActive = async (user: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          ativo: !user.ativo,
          data_atualizacao: new Date()
        })
        .eq('id', user.id);

      if (error) throw error;

      message.success(`Usuário ${user.ativo ? 'desativado' : 'ativado'} com sucesso`);
      loadUsers();
    } catch (error) {
      message.error('Erro ao alterar status do usuário');
      console.error(error);
    }
  };

  const columns = [
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
      sorter: (a: any, b: any) => a.nome.localeCompare(b.nome)
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Papel',
      dataIndex: 'papel',
      key: 'papel',
      render: (papel: PapelSistema) => PAPEIS[papel]
    },
    {
      title: 'Telefone',
      dataIndex: 'telefone',
      key: 'telefone'
    },
    {
      title: 'Status',
      dataIndex: 'ativo',
      key: 'ativo',
      render: (ativo: boolean, record: any) => (
        <Popconfirm
          title={`Deseja ${ativo ? 'desativar' : 'ativar'} este usuário?`}
          onConfirm={() => handleToggleActive(record)}
        >
          <Switch checked={ativo} />
        </Popconfirm>
      )
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Button 
            type="link" 
            onClick={() => {
              setEditingUser(record);
              form.setFieldsValue({
                nome: record.nome,
                email: record.email,
                telefone: record.telefone,
                papel: record.papel
              });
              setModalVisible(true);
            }}
          >
            Editar
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            setEditingUser(null);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          Novo Usuário
        </Button>
      </div>

      <Table
        loading={loading}
        dataSource={users}
        columns={columns}
        rowKey="id"
      />

      <Modal
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingUser(null);
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="nome"
            label="Nome"
            rules={[{ required: true, message: 'Por favor, insira o nome' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nome completo" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Por favor, insira o email' },
              { type: 'email', message: 'Por favor, insira um email válido' }
            ]}
          >
            <Input type="email" placeholder="Email" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="senha"
              label="Senha"
              rules={[
                { required: true, message: 'Por favor, insira a senha' },
                { min: 8, message: 'A senha deve ter pelo menos 8 caracteres' }
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Senha" />
            </Form.Item>
          )}

          <Form.Item
            name="papel"
            label="Papel"
            rules={[{ required: true, message: 'Por favor, selecione o papel' }]}
          >
            <Select placeholder="Selecione o papel">
              {Object.entries(PAPEIS).map(([value, label]) => (
                <Option key={value} value={value}>{label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="telefone"
            label="Telefone"
          >
            <Input 
              prefix={<PhoneOutlined />} 
              placeholder="(00) 00000-0000" 
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={loading}
              >
                {editingUser ? 'Atualizar' : 'Criar'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingUser(null);
              }}>
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
