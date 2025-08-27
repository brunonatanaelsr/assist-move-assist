-- Corrigir as policies de INSERT para ter WITH CHECK correto
-- Beneficiarias
DROP POLICY IF EXISTS "Authenticated users can insert beneficiarias" ON public.beneficiarias;
CREATE POLICY "Authenticated users can insert beneficiarias" 
ON public.beneficiarias 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.user_id = auth.uid())));

-- Anamneses Social
DROP POLICY IF EXISTS "Authenticated users can insert anamneses_social" ON public.anamneses_social;
CREATE POLICY "Authenticated users can insert anamneses_social" 
ON public.anamneses_social 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.user_id = auth.uid())));

-- Declarações de Comparecimento
DROP POLICY IF EXISTS "Authenticated users can insert declaracoes_comparecimento" ON public.declaracoes_comparecimento;
CREATE POLICY "Authenticated users can insert declaracoes_comparecimento" 
ON public.declaracoes_comparecimento 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.user_id = auth.uid())));

-- Fichas de Evolução
DROP POLICY IF EXISTS "Authenticated users can insert fichas_evolucao" ON public.fichas_evolucao;
CREATE POLICY "Authenticated users can insert fichas_evolucao" 
ON public.fichas_evolucao 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.user_id = auth.uid())));

-- Termos de Consentimento
DROP POLICY IF EXISTS "Authenticated users can insert termos_consentimento" ON public.termos_consentimento;
CREATE POLICY "Authenticated users can insert termos_consentimento" 
ON public.termos_consentimento 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.user_id = auth.uid())));

-- Visões Holísticas
DROP POLICY IF EXISTS "Authenticated users can insert visoes_holisticas" ON public.visoes_holisticas;
CREATE POLICY "Authenticated users can insert visoes_holisticas" 
ON public.visoes_holisticas 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.user_id = auth.uid())));

-- Roda da Vida
DROP POLICY IF EXISTS "Authenticated users can insert roda_vida" ON public.roda_vida;
CREATE POLICY "Authenticated users can insert roda_vida" 
ON public.roda_vida 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.user_id = auth.uid())));

-- Planos de Ação
DROP POLICY IF EXISTS "Authenticated users can insert planos_acao" ON public.planos_acao;
CREATE POLICY "Authenticated users can insert planos_acao" 
ON public.planos_acao 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.user_id = auth.uid())));

-- Matrículas de Projetos
DROP POLICY IF EXISTS "Authenticated users can insert matriculas_projetos" ON public.matriculas_projetos;
CREATE POLICY "Authenticated users can insert matriculas_projetos" 
ON public.matriculas_projetos 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.user_id = auth.uid())));

-- Recibos de Benefício
DROP POLICY IF EXISTS "Authenticated users can insert recibos_beneficio" ON public.recibos_beneficio;
CREATE POLICY "Authenticated users can insert recibos_beneficio" 
ON public.recibos_beneficio 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.user_id = auth.uid())));

-- Membros da Família
DROP POLICY IF EXISTS "Authenticated users can insert membros_familia" ON public.membros_familia;
CREATE POLICY "Authenticated users can insert membros_familia" 
ON public.membros_familia 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE (profiles.user_id = auth.uid())));
