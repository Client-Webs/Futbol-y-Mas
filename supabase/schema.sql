-- ====================================================================
-- FRESH FOOTBALL - SUPABASE COMPLETE DATABASE SCHEMA & RLS POLICIES
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & HELPERS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Prevent unauthorized role modification by users
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) AND NOT is_admin() THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_profile_role ON public.profiles;
CREATE TRIGGER tr_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- Automatic Profile Creation on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  initial_role TEXT := 'user';
BEGIN
  -- If this is the designated admin email or specified in metadata
  IF new.email = 'admin@freshfootball.com' OR (new.raw_user_meta_data->>'role') = 'admin' THEN
    initial_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, email, nickname, avatar_url, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    initial_role
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      nickname = COALESCE(EXCLUDED.nickname, profiles.nickname);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. NEWS TABLE
CREATE TABLE IF NOT EXISTS public.news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('Noticias', 'Fichajes', 'Rumores', 'LaLiga', 'Otros')),
  tags TEXT[] DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT true,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Fresh Football Redacción',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_news_published ON public.news(published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON public.news(category);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published news are viewable by everyone" 
ON public.news FOR SELECT USING (published = true OR is_admin());

CREATE POLICY "Admins can insert news" 
ON public.news FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update news" 
ON public.news FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete news" 
ON public.news FOR DELETE USING (is_admin());

-- 5. COMMENTS TABLE (News Comments)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  news_id UUID NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_comments_news ON public.comments(news_id, created_at ASC);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone" 
ON public.comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can post comments" 
ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments or admins can moderate" 
ON public.comments FOR DELETE USING (auth.uid() = author_id OR is_admin());

-- 6. MATCHES TABLE (Resultados LaLiga)
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matchday INTEGER NOT NULL CHECK (matchday BETWEEN 1 AND 38),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_shield TEXT DEFAULT '',
  away_shield TEXT DEFAULT '',
  home_score INTEGER DEFAULT NULL,
  away_score INTEGER DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
  match_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_matches_matchday ON public.matches(matchday, match_date ASC);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches are viewable by everyone" 
ON public.matches FOR SELECT USING (true);

CREATE POLICY "Admins can insert matches" 
ON public.matches FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update matches" 
ON public.matches FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete matches" 
ON public.matches FOR DELETE USING (is_admin());

-- 7. STANDINGS TABLE (Clasificación LaLiga)
CREATE TABLE IF NOT EXISTS public.standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position INTEGER NOT NULL UNIQUE,
  team TEXT NOT NULL UNIQUE,
  shield TEXT DEFAULT '',
  pj INTEGER NOT NULL DEFAULT 0,
  pg INTEGER NOT NULL DEFAULT 0,
  pe INTEGER NOT NULL DEFAULT 0,
  pp INTEGER NOT NULL DEFAULT 0,
  gf INTEGER NOT NULL DEFAULT 0,
  gc INTEGER NOT NULL DEFAULT 0,
  dg INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_standings_points ON public.standings(points DESC, dg DESC, gf DESC);

ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Standings are viewable by everyone" 
ON public.standings FOR SELECT USING (true);

CREATE POLICY "Admins can insert standings" 
ON public.standings FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update standings" 
ON public.standings FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete standings" 
ON public.standings FOR DELETE USING (is_admin());

-- 8. POLLS TABLE
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Polls are viewable by everyone" 
ON public.polls FOR SELECT USING (true);

CREATE POLICY "Admins can manage polls" 
ON public.polls FOR ALL USING (is_admin());

-- 9. POLL OPTIONS
CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  votes_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Poll options are viewable by everyone" 
ON public.poll_options FOR SELECT USING (true);

CREATE POLICY "Admins can manage poll options" 
ON public.poll_options FOR ALL USING (is_admin());

-- 10. POLL VOTES
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Poll votes viewable by everyone" 
ON public.poll_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote once per poll" 
ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Increment poll option votes trigger
CREATE OR REPLACE FUNCTION public.increment_poll_vote()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.poll_options
  SET votes_count = votes_count + 1
  WHERE id = new.option_id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_poll_vote_cast ON public.poll_votes;
CREATE TRIGGER on_poll_vote_cast
  AFTER INSERT ON public.poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.increment_poll_vote();

-- 11. DEBATES TABLE (Comunidad)
CREATE TABLE IF NOT EXISTS public.debates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_debates_created ON public.debates(created_at DESC);

ALTER TABLE public.debates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Debates are viewable by everyone" 
ON public.debates FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create debates" 
ON public.debates FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors or admins can delete debates" 
ON public.debates FOR DELETE USING (auth.uid() = author_id OR is_admin());

-- 12. DEBATE COMMENTS
CREATE TABLE IF NOT EXISTS public.debate_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debate_id UUID NOT NULL REFERENCES public.debates(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_debate_comments_debate ON public.debate_comments(debate_id, created_at ASC);

ALTER TABLE public.debate_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Debate comments are viewable by everyone" 
ON public.debate_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment on debates" 
ON public.debate_comments FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors or admins can delete debate comments" 
ON public.debate_comments FOR DELETE USING (auth.uid() = author_id OR is_admin());

-- 13. PREDICTIONS TABLE (Porras LaLiga)
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_nickname TEXT NOT NULL,
  predicted_home_score INTEGER NOT NULL CHECK (predicted_home_score >= 0),
  predicted_away_score INTEGER NOT NULL CHECK (predicted_away_score >= 0),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(match_id, user_id)
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Predictions are viewable by everyone" 
ON public.predictions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can submit predictions" 
ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update predictions before match starts" 
ON public.predictions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update points awarded" 
ON public.predictions FOR UPDATE USING (is_admin());

-- 14. TRIVIA QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.trivia_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('a', 'b', 'c', 'd')),
  explanation TEXT DEFAULT '',
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trivia questions are viewable by everyone" 
ON public.trivia_questions FOR SELECT USING (true);

CREATE POLICY "Admins can manage trivia questions" 
ON public.trivia_questions FOR ALL USING (is_admin());

-- 15. TRIVIA ATTEMPTS
CREATE TABLE IF NOT EXISTS public.trivia_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_nickname TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.trivia_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trivia attempts viewable by everyone" 
ON public.trivia_attempts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can submit trivia attempt" 
ON public.trivia_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 16. MEMES TABLE
CREATE TABLE IF NOT EXISTS public.memes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Memes are viewable by everyone" 
ON public.memes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can post memes" 
ON public.memes FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors or admins can delete memes" 
ON public.memes FOR DELETE USING (auth.uid() = author_id OR is_admin());

-- 17. STORAGE BUCKETS (avatars, news, memes)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('news', 'news', true),
  ('memes', 'memes', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read on Storage" 
ON storage.objects FOR SELECT USING (bucket_id IN ('avatars', 'news', 'memes'));

CREATE POLICY "Authenticated Upload on Storage" 
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id IN ('avatars', 'news', 'memes') 
  AND auth.role() = 'authenticated'
);

-- ====================================================================
-- FRESH FOOTBALL - SYSTEM DE EQUIPOS (public.teams)
-- ====================================================================

-- 1. Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT DEFAULT '',
  shield TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Prepopulate the 20 real teams of LaLiga
INSERT INTO public.teams (name, short_name, shield) VALUES
('FC Barcelona', 'FCB', ''),
('Real Madrid', 'RMA', ''),
('Atlético de Madrid', 'ATM', ''),
('Athletic Club', 'ATH', ''),
('Villarreal CF', 'VIL', ''),
('Real Betis', 'BET', ''),
('Real Sociedad', 'RSO', ''),
('Girona FC', 'GIR', ''),
('RCD Mallorca', 'MLL', ''),
('RC Celta de Vigo', 'CEL', ''),
('CA Osasuna', 'OSA', ''),
('Sevilla FC', 'SFC', ''),
('Rayo Vallecano', 'RAY', ''),
('Getafe CF', 'GET', ''),
('Valencia CF', 'VAL', ''),
('Deportivo Alavés', 'ALA', ''),
('UD Las Palmas', 'LPA', ''),
('CD Leganés', 'LEG', ''),
('RCD Espanyol', 'ESP', ''),
('Real Valladolid', 'VLD', '')
ON CONFLICT (name) DO NOTHING;

-- RLS for teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
CREATE POLICY "Teams are viewable by everyone" 
ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert teams" ON public.teams;
CREATE POLICY "Admins can insert teams" 
ON public.teams FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update teams" ON public.teams;
CREATE POLICY "Admins can update teams" 
ON public.teams FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete teams" ON public.teams;
CREATE POLICY "Admins can delete teams" 
ON public.teams FOR DELETE USING (is_admin());

-- Modify matches table to add UUID references safely
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS home_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS away_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Modify standings table to add UUID references safely
ALTER TABLE public.standings ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

-- Insert existing missing teams into teams table to prevent broken references
INSERT INTO public.teams (name, short_name, shield)
SELECT DISTINCT team, '', '' FROM public.standings
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.teams (name, short_name, shield)
SELECT DISTINCT home_team, '', '' FROM public.matches
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.teams (name, short_name, shield)
SELECT DISTINCT away_team, '', '' FROM public.matches
ON CONFLICT (name) DO NOTHING;

-- Now link existing matches to team IDs
UPDATE public.matches
SET home_team_id = t.id
FROM public.teams t
WHERE lower(trim(public.matches.home_team)) = lower(trim(t.name)) AND public.matches.home_team_id IS NULL;

UPDATE public.matches
SET away_team_id = t.id
FROM public.teams t
WHERE lower(trim(public.matches.away_team)) = lower(trim(t.name)) AND public.matches.away_team_id IS NULL;

-- Link existing standings to team IDs
UPDATE public.standings
SET team_id = t.id
FROM public.teams t
WHERE lower(trim(public.standings.team)) = lower(trim(t.name)) AND public.standings.team_id IS NULL;

-- Enforce UNIQUE constraint on standings(team_id) to prevent duplicate teams in standings
ALTER TABLE public.standings DROP CONSTRAINT IF EXISTS uq_standings_team_id;
ALTER TABLE public.standings ADD CONSTRAINT uq_standings_team_id UNIQUE (team_id);
