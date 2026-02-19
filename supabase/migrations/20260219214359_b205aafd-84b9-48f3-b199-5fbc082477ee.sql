
-- Create table_logs for operation history
CREATE TABLE public.table_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_num INTEGER NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  payment_type TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.table_logs ENABLE ROW LEVEL SECURITY;

-- Public read for admin
CREATE POLICY "Admins can read logs" ON public.table_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Allow inserts from authenticated users (staff operations)
CREATE POLICY "Authenticated can insert logs" ON public.table_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_logs;
