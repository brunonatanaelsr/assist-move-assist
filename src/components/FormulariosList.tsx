import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Space,
  Button,
  DatePicker,
  Input,
  Select,
  Tag,
  Typography
} from 'antd';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Formulario, FormularioFiltros, TIPOS_FORMULARIO } from '../types/formularios';
import { useAuth } from '../hooks/useAuth';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title } = Typography;

export const FormulariosList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [filtros, setFiltros] = useState<FormularioFiltros>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const carregarFormularios = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/formularios?' + new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...filtros.tipo && { tipo: filtros.tipo },
        ...filtros.beneficiaria_id && { beneficiaria_id: filtros.beneficiaria_id.toString() },
        ...filtros.data_inicio && { data_inicio: filtros.data_inicio.toISOString() },
        ...filtros.data_fim && { data_fim: filtros.data_fim.toISOString() },
        ...filtros.responsavel && { responsavel: filtros.responsavel }
      }));

      const data = await response.json();
      setFormularios(data.data);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Erro ao carregar formulários:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFormularios();
  }, [page, pageSize, filtros]);

  const colunas = [
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      render: (tipo: keyof typeof TIPOS_FORMULARIO) => (
        <Tag color={
          tipo === 'anamnese_social' ? 'blue' :
          tipo === 'roda_da_vida' ? 'green' :
          'purple'
        }>
          {TIPOS_FORMULARIO[tipo]}
        </Tag>
      ),
      filters: Object.entries(TIPOS_FORMULARIO).map(([value, label]) => ({
        text: label,
        value
      })),
      onFilter: (value: string, record: Formulario) => record.tipo === value
    },
    {
      title: 'Beneficiária',
      dataIndex: 'beneficiaria_nome',
      key: 'beneficiaria_nome',
      sorter: (a: Formulario, b: Formulario) => 
        (a.beneficiaria_nome || '').localeCompare(b.beneficiaria_nome || '')
    },
    {
      title: 'Responsável',
      dataIndex: 'responsavel_preenchimento',
      key: 'responsavel_preenchimento'
    },
    {
      title: 'Data de Criação',
      dataIndex: 'data_criacao',
      key: 'data_criacao',
      render: (data: string) => dayjs(data).format('DD/MM/YYYY HH:mm'),
      sorter: (a: Formulario, b: Formulario) =>
        dayjs(a.data_criacao).unix() - dayjs(b.data_criacao).unix()
    },
    {
      title: 'Ações',
      key: 'acoes',
      render: (record: Formulario) => (
        <Space>
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => navigate(`/formularios/${record.tipo}/${record.id}`)}
          >
            Visualizar
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Card>
      <Title level={2}>Formulários</Title>

      <Space style={{ marginBottom: 16 }} size="middle">
        <Button
          type="primary"
          onClick={() => navigate('/formularios/novo')}
        >
          Novo Formulário
        </Button>

        <Input
          placeholder="Buscar por beneficiária"
          prefix={<SearchOutlined />}
          allowClear
          onChange={(e) => setFiltros(prev => ({ ...prev, beneficiaria: e.target.value }))}
        />

        <Select
          placeholder="Tipo de formulário"
          allowClear
          style={{ width: 200 }}
          onChange={(value) => setFiltros(prev => ({ ...prev, tipo: value }))}
        >
          {Object.entries(TIPOS_FORMULARIO).map(([value, label]) => (
            <Option key={value} value={value}>{label}</Option>
          ))}
        </Select>

        <RangePicker
          onChange={(dates) => {
            if (dates) {
              setFiltros(prev => ({
                ...prev,
                data_inicio: dates[0]?.toDate(),
                data_fim: dates[1]?.toDate()
              }));
            } else {
              setFiltros(prev => ({
                ...prev,
                data_inicio: undefined,
                data_fim: undefined
              }));
            }
          }}
        />
      </Space>

      <Table
        columns={colunas}
        dataSource={formularios}
        loading={loading}
        rowKey="id"
        pagination={{
          total,
          current: page,
          pageSize,
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          },
          showSizeChanger: true,
          showTotal: (total) => `Total: ${total} formulários`
        }}
      />
    </Card>
  );
};
