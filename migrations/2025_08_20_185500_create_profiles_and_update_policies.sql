-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nome_completo VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  tipo_usuario user_type NOT NULL DEFAULT 'profissional',
  avatar_url TEXT,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND tipo_usuario = 'admin'
  )
);

CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND tipo_usuario = 'admin'
  ) OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid())
);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome_completo, email, tipo_usuario)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'tipo_usuario')::user_type, 'profissional')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update triggers for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS policies for other tables to use profiles
-- Update beneficiarias policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.beneficiarias;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.beneficiarias;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.beneficiarias;

CREATE POLICY "Authenticated users can view beneficiarias" 
ON public.beneficiarias 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can insert beneficiarias" 
ON public.beneficiarias 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can update beneficiarias" 
ON public.beneficiarias 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid()
  )
);

-- Apply similar policies to all form tables
DO $$
DECLARE
  table_name TEXT;
  tables TEXT[] := ARRAY[
    'declaracoes_comparecimento', 'recibos_beneficio', 
    'anamneses_social', 'membros_familia', 'fichas_evolucao',
    'termos_consentimento', 'visoes_holisticas', 'roda_vida',
    'planos_acao', 'matriculas_projetos'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    -- Drop old policies
    EXECUTE format('DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.%I', table_name);
    
    -- Create new policies
    EXECUTE format('CREATE POLICY "Authenticated users can view %I" ON public.%I FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid()))', table_name, table_name);
    EXECUTE format('CREATE POLICY "Authenticated users can insert %I" ON public.%I FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid()))', table_name, table_name);
    EXECUTE format('CREATE POLICY "Authenticated users can update %I" ON public.%I FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid()))', table_name, table_name);
  END LOOP;
END $$;
