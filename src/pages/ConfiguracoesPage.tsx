import React, { useState } from 'react';
import {
  Layout,
  Typography,
  Tabs,
  Card,
  message
} from 'antd';
import { UserManagement } from '../components/UserManagement';
import { PermissionManagement } from '../components/PermissionManagement';
import { useAuth } from '../hooks/useAuth';

const { Content } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

export const ConfiguracoesPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('1');

  if (!user) {
    return null;
  }

  const isAdmin = user.role === 'admin';

  return (
    <Layout>
      <Content style={{ padding: '24px' }}>
        <Title level={2}>Configurações do Sistema</Title>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          items={[
            {
              key: '1',
              label: 'Usuários',
              children: isAdmin ? (
                <Card>
                  <UserManagement />
                </Card>
              ) : (
                <Card>
                  <Typography.Text type="warning">
                    Você não tem permissão para gerenciar usuários.
                  </Typography.Text>
                </Card>
              )
            },
            {
              key: '2',
              label: 'Permissões',
              children: isAdmin ? (
                <Card>
                  <PermissionManagement
                    userId={user.id}
                    userRole={user.role}
                  />
                </Card>
              ) : (
                <Card>
                  <Typography.Text type="warning">
                    Você não tem permissão para gerenciar permissões.
                  </Typography.Text>
                </Card>
              )
            },
            {
              key: '3',
              label: 'Configurações Gerais',
              children: (
                <Card>
                  <Typography.Text>
                    Configurações gerais do sistema em desenvolvimento.
                  </Typography.Text>
                </Card>
              )
            }
          ]}
        />
      </Content>
    </Layout>
  );
};
