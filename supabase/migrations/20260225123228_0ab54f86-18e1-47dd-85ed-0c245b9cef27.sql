
-- 1. Install pgcrypto in extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- 2. Create a function to hash PINs using extensions schema
CREATE OR REPLACE FUNCTION public.hash_pin(plain_pin text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = 'public', 'extensions'
AS $$
  SELECT CASE WHEN plain_pin = '' THEN '' ELSE extensions.crypt(plain_pin, extensions.gen_salt('bf')) END;
$$;

-- 3. Create a function to verify PINs
CREATE OR REPLACE FUNCTION public.verify_pin(p_staff_id uuid, plain_pin text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE id = p_staff_id AND pin = extensions.crypt(plain_pin, pin)
  );
$$;

-- 4. Hash all existing plaintext PINs
UPDATE public.staff
SET pin = CASE WHEN pin = '' THEN '' ELSE extensions.crypt(pin, extensions.gen_salt('bf')) END
WHERE pin != '' AND pin NOT LIKE '$2a$%' AND pin NOT LIKE '$2b$%';

-- 5. Add staff self-read policy
CREATE POLICY "Staff can read own record"
ON public.staff FOR SELECT
TO authenticated
USING (user_id = auth.uid());
