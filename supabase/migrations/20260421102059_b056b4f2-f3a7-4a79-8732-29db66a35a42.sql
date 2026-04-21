-- Comics table
CREATE TABLE public.comics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  share_id TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  title TEXT NOT NULL,
  panels JSONB NOT NULL,
  style_id TEXT,
  style_name TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comics_user ON public.comics(user_id, created_at DESC);
CREATE INDEX idx_comics_share ON public.comics(share_id);

ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read public comics — needed for shareable /c/:id links
CREATE POLICY "Public comics readable by anyone"
  ON public.comics FOR SELECT
  USING (is_public = true);

-- Owners can read all their own comics
CREATE POLICY "Users can read own comics"
  ON public.comics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own comics"
  ON public.comics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comics"
  ON public.comics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comics"
  ON public.comics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_comics_updated_at
  BEFORE UPDATE ON public.comics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();