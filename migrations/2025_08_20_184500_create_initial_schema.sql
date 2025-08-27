-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_type AS ENUM ('admin', 'profissional');

-- Create Usuario table
CREATE TABLE public.usuarios (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  tipo_usuario user_type NOT NULL,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Beneficiaria table
CREATE TABLE public.beneficiarias (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome_completo VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  rg VARCHAR(20),
  orgao_emissor_rg VARCHAR(50),
  data_emissao_rg DATE,
  data_nascimento DATE NOT NULL,
  idade INTEGER,
  endereco TEXT,
  bairro VARCHAR(100),
  nis VARCHAR(20),
  contato1 VARCHAR(20) NOT NULL,
  contato2 VARCHAR(20),
  referencia VARCHAR(255),
  data_inicio_instituto DATE,
  programa_servico VARCHAR(255),
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create DeclaracaoComparecimento table
CREATE TABLE public.declaracoes_comparecimento (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  beneficiaria_id UUID NOT NULL REFERENCES public.beneficiarias(id),
  data_comparecimento DATE NOT NULL,
  hora_entrada TIME,
  hora_saida TIME,
  profissional_responsavel VARCHAR(255) NOT NULL,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ReciboBeneficio table
CREATE TABLE public.recibos_beneficio (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  beneficiaria_id UUID NOT NULL REFERENCES public.beneficiarias(id),
  tipo_beneficio VARCHAR(255) NOT NULL,
  data_recebimento DATE NOT NULL,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AnamneseSocial table
CREATE TABLE public.anamneses_social (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  beneficiaria_id UUID NOT NULL REFERENCES public.beneficiarias(id),
  data_anamnese DATE NOT NULL,
  observacoes_importantes TEXT,
  uso_alcool BOOLEAN DEFAULT FALSE,
  uso_drogas_ilicitas BOOLEAN DEFAULT FALSE,
  uso_cigarros BOOLEAN DEFAULT FALSE,
  uso_outros VARCHAR(255),
  transtorno_mental_desenvolvimento BOOLEAN DEFAULT FALSE,
  desafios_transtorno TEXT,
  deficiencia BOOLEAN DEFAULT FALSE,
  desafios_deficiencia TEXT,
  idosos_dependentes BOOLEAN DEFAULT FALSE,
  desafios_idosos TEXT,
  doenca_cronica_degenerativa BOOLEAN DEFAULT FALSE,
  desafios_doenca TEXT,
  vulnerabilidades TEXT[],
  assinatura_beneficiaria BOOLEAN DEFAULT FALSE,
  assinatura_tecnica BOOLEAN DEFAULT FALSE,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create MembroFamiliar table
CREATE TABLE public.membros_familia (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  anamnese_id UUID NOT NULL REFERENCES public.anamneses_social(id),
  nome VARCHAR(255) NOT NULL,
  data_nascimento DATE,
  idade INTEGER,
  trabalha BOOLEAN DEFAULT FALSE,
  renda DECIMAL(10,2),
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create FichaEvolucao table
CREATE TABLE public.fichas_evolucao (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  beneficiaria_id UUID NOT NULL REFERENCES public.beneficiarias(id),
  data_evolucao DATE NOT NULL,
  descricao TEXT NOT NULL,
  responsavel VARCHAR(255) NOT NULL,
  assinatura_beneficiaria BOOLEAN DEFAULT FALSE,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create TermoConsentimento table
CREATE TABLE public.termos_consentimento (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  beneficiaria_id UUID NOT NULL REFERENCES public.beneficiarias(id),
  data_consentimento DATE NOT NULL,
  nacionalidade VARCHAR(100),
  estado_civil VARCHAR(50),
  uso_imagem_autorizado BOOLEAN NOT NULL,
  tratamento_dados_autorizado BOOLEAN NOT NULL,
  assinatura_voluntaria BOOLEAN DEFAULT FALSE,
  assinatura_responsavel_familiar BOOLEAN DEFAULT FALSE,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create VisaoHolistica table
CREATE TABLE public.visoes_holisticas (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  beneficiaria_id UUID NOT NULL REFERENCES public.beneficiarias(id),
  historia_vida TEXT,
  rede_apoio TEXT,
  visao_tecnica_referencia TEXT,
  encaminhamento_projeto TEXT,
  data_visao DATE NOT NULL,
  assinatura_tecnica BOOLEAN DEFAULT FALSE,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RodaVida table
CREATE TABLE public.roda_vida (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  beneficiaria_id UUID NOT NULL REFERENCES public.beneficiarias(id),
  data_roda DATE NOT NULL,
  espiritualidade_score INTEGER CHECK (espiritualidade_score >= 1 AND espiritualidade_score <= 10),
  saude_score INTEGER CHECK (saude_score >= 1 AND saude_score <= 10),
  lazer_score INTEGER CHECK (lazer_score >= 1 AND lazer_score <= 10),
  equilibrio_emocional_score INTEGER CHECK (equilibrio_emocional_score >= 1 AND equilibrio_emocional_score <= 10),
  vida_social_score INTEGER CHECK (vida_social_score >= 1 AND vida_social_score <= 10),
  relacionamento_familiar_score INTEGER CHECK (relacionamento_familiar_score >= 1 AND relacionamento_familiar_score <= 10),
  recursos_financeiros_score INTEGER CHECK (recursos_financeiros_score >= 1 AND recursos_financeiros_score <= 10),
  amor_score INTEGER CHECK (amor_score >= 1 AND amor_score <= 10),
  contribuicao_social_score INTEGER CHECK (contribuicao_social_score >= 1 AND contribuicao_social_score <= 10),
  proposito_score INTEGER CHECK (proposito_score >= 1 AND proposito_score <= 10),
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PlanoAcaoPersonalizado table
CREATE TABLE public.planos_acao (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  beneficiaria_id UUID NOT NULL REFERENCES public.beneficiarias(id),
  objetivos TEXT NOT NULL,
  acoes TEXT NOT NULL,
  prazos VARCHAR(255),
  responsaveis VARCHAR(255),
  resultados_esperados TEXT,
  acompanhamento TEXT,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create MatriculaProjetoSocial table
CREATE TABLE public.matriculas_projetos (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  beneficiaria_id UUID NOT NULL REFERENCES public.beneficiarias(id),
  nome_projeto VARCHAR(255) NOT NULL,
  data_inicio_projeto DATE NOT NULL,
  data_termino_projeto DATE,
  carga_horaria VARCHAR(100),
  escolaridade VARCHAR(100),
  profissao VARCHAR(100),
  renda_familiar DECIMAL(10,2),
  observacoes_matricula TEXT,
  assinatura_participante BOOLEAN DEFAULT FALSE,
  assinatura_coordenador BOOLEAN DEFAULT FALSE,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beneficiarias_updated_at
  BEFORE UPDATE ON public.beneficiarias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate age
CREATE OR REPLACE FUNCTION public.calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM AGE(birth_date));
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate age
CREATE OR REPLACE FUNCTION public.update_beneficiaria_age()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_nascimento IS NOT NULL THEN
    NEW.idade = public.calculate_age(NEW.data_nascimento);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_beneficiaria_age
  BEFORE INSERT OR UPDATE ON public.beneficiarias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_beneficiaria_age();

-- Enable Row Level Security
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.declaracoes_comparecimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recibos_beneficio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamneses_social ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros_familia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_evolucao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.termos_consentimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visoes_holisticas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roda_vida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_acao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas_projetos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic - will be refined)
CREATE POLICY "Enable read access for authenticated users" ON public.beneficiarias
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.beneficiarias
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.beneficiarias
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Apply similar policies to other tables
DO $$
DECLARE
  table_name TEXT;
  tables TEXT[] := ARRAY[
    'usuarios', 'declaracoes_comparecimento', 'recibos_beneficio', 
    'anamneses_social', 'membros_familia', 'fichas_evolucao',
    'termos_consentimento', 'visoes_holisticas', 'roda_vida',
    'planos_acao', 'matriculas_projetos'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    EXECUTE format('CREATE POLICY "Enable read access for authenticated users" ON public.%I FOR SELECT USING (auth.role() = ''authenticated'')', table_name);
    EXECUTE format('CREATE POLICY "Enable insert for authenticated users" ON public.%I FOR INSERT WITH CHECK (auth.role() = ''authenticated'')', table_name);
    EXECUTE format('CREATE POLICY "Enable update for authenticated users" ON public.%I FOR UPDATE USING (auth.role() = ''authenticated'')', table_name);
  END LOOP;
END $$;
