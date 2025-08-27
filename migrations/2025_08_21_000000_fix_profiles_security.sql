-- Fix security vulnerability: Remove overly permissive profile access
-- Currently "Authenticated users can view profiles" allows ALL authenticated users to see ALL profiles
-- This should be restricted to only allow users to see their own profile

-- Drop the problematic policy that allows all authenticated users to view all profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Keep only the secure policy that allows users to view their own profile
-- This policy already exists: "Users can view their own profile" with (auth.uid() = user_id)

-- Verify the remaining policies are secure:
-- INSERT: "Users can insert their own profile" - ✓ Secure (auth.uid() = user_id)
-- UPDATE: "Users can update their own profile" - ✓ Secure (auth.uid() = user_id)  
-- SELECT: "Users can view their own profile" - ✓ Secure (auth.uid() = user_id)

-- Add a comment for documentation
COMMENT ON TABLE public.profiles IS 'User profiles table with RLS restricting access to own profile only for security';
