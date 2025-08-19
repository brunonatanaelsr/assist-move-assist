import React from 'react';
import { Layout, Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';
import { FormulariosList } from '../components/FormulariosList';

const { Content } = Layout;

export const FormulariosPage: React.FC = () => {
  return (
    <Layout>
      <Content style={{ padding: '0 24px' }}>
        <Breadcrumb style={{ margin: '16px 0' }}>
          <Breadcrumb.Item>
            <Link to="/">Início</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>Formulários</Breadcrumb.Item>
        </Breadcrumb>
        
        <div style={{ padding: 24, minHeight: 360, background: '#fff' }}>
          <FormulariosList />
        </div>
      </Content>
    </Layout>
  );
};
