-- Fix critical security vulnerability: Restrict access to sensitive beneficiary data
-- Only authorized healthcare professionals should access personal medical information

-- Drop existing overly permissive policies for beneficiarias table
DROP POLICY IF EXISTS "Authenticated users can view beneficiarias" ON public.beneficiarias;
DROP POLICY IF EXISTS "Authenticated users can insert beneficiarias" ON public.beneficiarias;
DROP POLICY IF EXISTS "Authenticated users can update beneficiarias" ON public.beneficiarias;

-- Create restrictive policies for beneficiarias table (contains sensitive personal data)
-- Only allow admin and profissional roles to access sensitive personal data
CREATE POLICY "Only healthcare professionals can view beneficiarias" 
ON public.beneficiarias 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

CREATE POLICY "Only healthcare professionals can insert beneficiarias" 
ON public.beneficiarias 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

CREATE POLICY "Only healthcare professionals can update beneficiarias" 
ON public.beneficiarias 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

-- Apply similar restrictions to other sensitive medical data tables
-- Anamneses Social (contains mental health and addiction data)
DROP POLICY IF EXISTS "Authenticated users can view anamneses_social" ON public.anamneses_social;
DROP POLICY IF EXISTS "Authenticated users can insert anamneses_social" ON public.anamneses_social;
DROP POLICY IF EXISTS "Authenticated users can update anamneses_social" ON public.anamneses_social;

CREATE POLICY "Only healthcare professionals can view anamneses_social" 
ON public.anamneses_social 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

CREATE POLICY "Only healthcare professionals can insert anamneses_social" 
ON public.anamneses_social 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

CREATE POLICY "Only healthcare professionals can update anamneses_social" 
ON public.anamneses_social 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

-- Medical declarations and attendance records
DROP POLICY IF EXISTS "Authenticated users can view declaracoes_comparecimento" ON public.declaracoes_comparecimento;
DROP POLICY IF EXISTS "Authenticated users can insert declaracoes_comparecimento" ON public.declaracoes_comparecimento;
DROP POLICY IF EXISTS "Authenticated users can update declaracoes_comparecimento" ON public.declaracoes_comparecimento;

CREATE POLICY "Only healthcare professionals can view declaracoes_comparecimento" 
ON public.declaracoes_comparecimento 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

CREATE POLICY "Only healthcare professionals can insert declaracoes_comparecimento" 
ON public.declaracoes_comparecimento 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

CREATE POLICY "Only healthcare professionals can update declaracoes_comparecimento" 
ON public.declaracoes_comparecimento 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

-- Medical evolution records
DROP POLICY IF EXISTS "Authenticated users can view fichas_evolucao" ON public.fichas_evolucao;
DROP POLICY IF EXISTS "Authenticated users can insert fichas_evolucao" ON public.fichas_evolucao;
DROP POLICY IF EXISTS "Authenticated users can update fichas_evolucao" ON public.fichas_evolucao;

CREATE POLICY "Only healthcare professionals can view fichas_evolucao" 
ON public.fichas_evolucao 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

CREATE POLICY "Only healthcare professionals can insert fichas_evolucao" 
ON public.fichas_evolucao 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

CREATE POLICY "Only healthcare professionals can update fichas_evolucao" 
ON public.fichas_evolucao 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

-- Family member data (contains personal information)
DROP POLICY IF EXISTS "Authenticated users can view membros_familia" ON public.membros_familia;
DROP POLICY IF EXISTS "Authenticated users can insert membros_familia" ON public.membros_familia;
DROP POLICY IF EXISTS "Authenticated users can update membros_familia" ON public.membros_familia;

CREATE POLICY "Only healthcare professionals can view membros_familia" 
ON public.membros_familia 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

CREATE POLICY "Only healthcare professionals can insert membros_familia" 
ON public.membros_familia 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

CREATE POLICY "Only healthcare professionals can update membros_familia" 
ON public.membros_familia 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.tipo_usuario IN ('admin', 'profissional')
  )
);

-- Add documentation comment
COMMENT ON TABLE public.beneficiarias IS 'Contains highly sensitive personal data (CPF, RG, addresses, etc). Access restricted to authorized healthcare professionals only.';
COMMENT ON TABLE public.anamneses_social IS 'Contains sensitive medical and psychological data. Access restricted to authorized healthcare professionals only.';
COMMENT ON TABLE public.membros_familia IS 'Contains personal family member data. Access restricted to authorized healthcare professionals only.';
