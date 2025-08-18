import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TextField, TextAreaField, SelectField, SwitchField } from '@/components/FormFields';
import { useForm } from '@/hooks/useForm';
import { validateOficinaData } from '@/utils/formValidation';
import type { OficinaFormData } from '@/types/forms';
import { ArrowLeft, Loader2 } from 'lucide-react';

const niveis = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' }
];

const categorias = [
  { value: 'profissionalizante', label: 'Profissionalizante' },
  { value: 'artesanato', label: 'Artesanato' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'saude', label: 'Saúde e Bem-estar' },
  { value: 'educacao', label: 'Educação' }
];

const NovaOficina: React.FC = () => {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const initialValues: OficinaFormData = {
    nome: '',
    descricao: '',
    instrutor: '',
    data_inicio: '',
    data_fim: '',
    horario_inicio: '',
    horario_fim: '',
    local: '',
    vagas_totais: 0,
    responsavel_id: 0, // Será preenchido com o ID do usuário logado
    status_detalhado: 'em_planejamento',
    tem_lista_espera: false,
    lista_espera_limite: 5,
    categoria: '',
    nivel: 'iniciante',
    carga_horaria: 0,
    certificado_disponivel: false
  };

  const validate = (values: OficinaFormData) => {
    const result = validateOficinaData(values);
    return result.errors.reduce((acc, error) => ({
      ...acc,
      [error.split(':')[0]]: error
    }), {});
  };

  const handleSubmit = async (values: OficinaFormData) => {
    try {
      setSubmitError(null);
      const response = await fetch('/api/oficinas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        throw new Error('Erro ao criar oficina');
      }

      navigate('/oficinas');
    } catch (error) {
      console.error('Erro ao criar oficina:', error);
      setSubmitError('Erro ao criar oficina. Tente novamente.');
    }
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit: onSubmit,
    setFieldValue
  } = useForm({
    initialValues,
    onSubmit: handleSubmit,
    validate
  });

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/oficinas')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <CardTitle>Nova Oficina</CardTitle>
              <CardDescription>
                Crie uma nova oficina preenchendo os dados abaixo
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Dados Básicos */}
            <div className="space-y-4">
              <TextField
                label="Nome da Oficina"
                name="nome"
                value={values.nome}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.nome ? errors.nome : undefined}
                required
              />

              <TextAreaField
                label="Descrição"
                name="descricao"
                value={values.descricao || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.descricao ? errors.descricao : undefined}
              />

              <TextField
                label="Instrutor"
                name="instrutor"
                value={values.instrutor || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.instrutor ? errors.instrutor : undefined}
              />
            </div>

            {/* Datas e Horários */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Data de Início"
                name="data_inicio"
                type="date"
                value={values.data_inicio}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.data_inicio ? errors.data_inicio : undefined}
                required
              />

              <TextField
                label="Data de Término"
                name="data_fim"
                type="date"
                value={values.data_fim || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.data_fim ? errors.data_fim : undefined}
              />

              <TextField
                label="Horário de Início"
                name="horario_inicio"
                type="time"
                value={values.horario_inicio}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.horario_inicio ? errors.horario_inicio : undefined}
                required
              />

              <TextField
                label="Horário de Término"
                name="horario_fim"
                type="time"
                value={values.horario_fim}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.horario_fim ? errors.horario_fim : undefined}
                required
              />
            </div>

            {/* Informações Adicionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Local"
                name="local"
                value={values.local || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.local ? errors.local : undefined}
              />

              <TextField
                label="Vagas Totais"
                name="vagas_totais"
                type="number"
                value={values.vagas_totais.toString()}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.vagas_totais ? errors.vagas_totais : undefined}
                required
              />

              <SelectField
                label="Categoria"
                name="categoria"
                value={values.categoria || ''}
                onChange={(value) => setFieldValue('categoria', value)}
                options={categorias}
                error={touched.categoria ? errors.categoria : undefined}
              />

              <SelectField
                label="Nível"
                name="nivel"
                value={values.nivel}
                onChange={(value) => setFieldValue('nivel', value)}
                options={niveis}
                error={touched.nivel ? errors.nivel : undefined}
              />

              <TextField
                label="Carga Horária (horas)"
                name="carga_horaria"
                type="number"
                value={values.carga_horaria?.toString() || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.carga_horaria ? errors.carga_horaria : undefined}
              />
            </div>

            {/* Opções Avançadas */}
            <div className="space-y-4">
              <SwitchField
                label="Permitir Lista de Espera"
                name="tem_lista_espera"
                checked={values.tem_lista_espera || false}
                onChange={(checked) => setFieldValue('tem_lista_espera', checked)}
                error={touched.tem_lista_espera ? errors.tem_lista_espera : undefined}
              />

              {values.tem_lista_espera && (
                <TextField
                  label="Limite da Lista de Espera"
                  name="lista_espera_limite"
                  type="number"
                  value={values.lista_espera_limite?.toString() || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.lista_espera_limite ? errors.lista_espera_limite : undefined}
                />
              )}

              <SwitchField
                label="Emitir Certificado"
                name="certificado_disponivel"
                checked={values.certificado_disponivel || false}
                onChange={(checked) => setFieldValue('certificado_disponivel', checked)}
                error={touched.certificado_disponivel ? errors.certificado_disponivel : undefined}
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/oficinas')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Criar Oficina'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NovaOficina;
