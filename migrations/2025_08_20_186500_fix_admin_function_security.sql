-- Fix function search path for security compliance
CREATE OR REPLACE FUNCTION create_admin_user(
  p_email text,
  p_nome_completo text
)
RETURNS void AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- This function should only be used for the first admin setup
  -- Real users should sign up through the auth system
  
  -- Create a placeholder profile that will be updated when the user signs up
  INSERT INTO public.profiles (id, user_id, nome_completo, email, tipo_usuario)
  VALUES (
    gen_random_uuid(),
    gen_random_uuid(), -- This will be replaced when user actually signs up
    p_nome_completo,
    p_email,
    'admin'
  );
  
  RAISE NOTICE 'Admin user profile created. User must sign up with email: %', p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
