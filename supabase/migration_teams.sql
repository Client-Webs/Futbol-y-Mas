-- ====================================================================
-- FRESH FOOTBALL - MIGRATION: SISTEMA PERMANENTE DE EQUIPOS (public.teams)
-- ====================================================================

-- 1. TABLA PERMANENTE DE EQUIPOS
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT DEFAULT '',
  shield TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_teams_name ON public.teams(name);

-- 2. SEGURIDAD RLS PARA EQUIPOS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
CREATE POLICY "Teams are viewable by everyone" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert teams" ON public.teams;
CREATE POLICY "Admins can insert teams" ON public.teams FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update teams" ON public.teams;
CREATE POLICY "Admins can update teams" ON public.teams FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete teams" ON public.teams;
CREATE POLICY "Admins can delete teams" ON public.teams FOR DELETE USING (is_admin());

-- 3. MODIFICAR PARTIDOS (matches) PARA VINCULAR CON public.teams
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS home_team_id UUID REFERENCES public.teams(id) ON DELETE RESTRICT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS away_team_id UUID REFERENCES public.teams(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_matches_home_team_id ON public.matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team_id ON public.matches(away_team_id);

-- 4. MODIFICAR CLASIFICACIÓN (standings) PARA VINCULAR CON public.teams
ALTER TABLE public.standings ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_standings_team_id ON public.standings(team_id);

-- 5. SEMILLA DE EQUIPOS REALES DE LALIGA (CON PROTECCIÓN CONTRA DUPLICADOS)
INSERT INTO public.teams (name, short_name, shield) VALUES
  ('FC Barcelona', 'BAR', ''),
  ('Real Madrid', 'RMA', ''),
  ('Atlético de Madrid', 'ATM', ''),
  ('Athletic Club', 'ATH', ''),
  ('Villarreal CF', 'VIL', ''),
  ('Real Betis', 'BET', ''),
  ('Real Sociedad', 'RSO', ''),
  ('Sevilla FC', 'SEV', ''),
  ('Deportivo Alavés', 'ALA', ''),
  ('Getafe CF', 'GET', ''),
  ('Rayo Vallecano', 'RAY', ''),
  ('CA Osasuna', 'OSA', ''),
  ('RC Celta de Vigo', 'CEL', ''),
  ('RCD Espanyol de Barcelona', 'ESP', ''),
  ('Valencia CF', 'VAL', ''),
  ('Málaga CF', 'MAL', ''),
  ('RC Deportivo', 'DEP', ''),
  ('Levante UD', 'LEV', ''),
  ('Elche CF', 'ELC', ''),
  ('R. Racing Club', 'RAC', ''),
  ('Girona FC', 'GIR', ''),
  ('RCD Mallorca', 'MLL', ''),
  ('CD Leganés', 'LEG', ''),
  ('UD Las Palmas', 'LPA', ''),
  ('Real Valladolid', 'VLL', '')
ON CONFLICT (name) DO NOTHING;

-- 6. MIGRACIÓN Y ASOCIACIÓN DE DATOS EXISTENTES (BACKFILL SIN BORRAR)
-- Vincular partidos existentes por nombre exacto o normalizado
UPDATE public.matches m
SET home_team_id = t.id
FROM public.teams t
WHERE m.home_team_id IS NULL 
  AND (m.home_team = t.name OR (m.home_team = 'Celta' AND t.name = 'RC Celta de Vigo') OR (m.home_team = 'Espanyol' AND t.name = 'RCD Espanyol de Barcelona'));

UPDATE public.matches m
SET away_team_id = t.id
FROM public.teams t
WHERE m.away_team_id IS NULL 
  AND (m.away_team = t.name OR (m.away_team = 'Celta' AND t.name = 'RC Celta de Vigo') OR (m.away_team = 'Espanyol' AND t.name = 'RCD Espanyol de Barcelona'));

-- Vincular clasificación existente
UPDATE public.standings s
SET team_id = t.id
FROM public.teams t
WHERE s.team_id IS NULL 
  AND s.team = t.name;
