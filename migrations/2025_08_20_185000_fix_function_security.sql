-- Fix function search paths for security compliance
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public;

CREATE OR REPLACE FUNCTION public.calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM AGE(birth_date));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_beneficiaria_age()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_nascimento IS NOT NULL THEN
    NEW.idade = public.calculate_age(NEW.data_nascimento);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public;
