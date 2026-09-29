/**
 * Fresh Football - Supabase Integration Client & Data Access Layer
 * Supports both live Supabase connection and seamless local fallback
 * when keys are being initialized.
 */
import { createClient } from '@supabase/supabase-js';

// Get config from Vite environment or localStorage for runtime customization
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const localConfigUrl = typeof window !== 'undefined' ? localStorage.getItem('fresh_supabase_url') || '' : '';
const localConfigKey = typeof window !== 'undefined' ? localStorage.getItem('fresh_supabase_key') || '' : '';

export const SUPABASE_URL = localConfigUrl || envUrl;
export const SUPABASE_KEY = localConfigKey || envKey;

export const isConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_KEY && 
  !SUPABASE_URL.includes('your-project-id') &&
  !SUPABASE_KEY.includes('your-anon-public-key')
);

// Create real client or null
export const supabase = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null;

// Local fallback store keys
const STORAGE_KEYS = {
  PROFILES: 'fresh_football_profiles',
  SESSION: 'fresh_football_session',
  NEWS: 'fresh_football_news',
  COMMENTS: 'fresh_football_comments',
  MATCHES: 'fresh_football_matches',
  STANDINGS: 'fresh_football_standings',
  TEAMS: 'fresh_football_teams',
  POLLS: 'fresh_football_polls',
  POLL_OPTIONS: 'fresh_football_poll_options',
  POLL_VOTES: 'fresh_football_poll_votes',
  DEBATES: 'fresh_football_debates',
  DEBATE_COMMENTS: 'fresh_football_debate_comments',
  PREDICTIONS: 'fresh_football_predictions',
  TRIVIA: 'fresh_football_trivia',
  TRIVIA_ATTEMPTS: 'fresh_football_trivia_attempts',
  MEMES: 'fresh_football_memes'
};

function getLocal(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Local storage read error', e);
    return [];
  }
}

function setLocal(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Local storage write error', e);
  }
}

/* ==========================================================================
   AUTHENTICATION API
   ========================================================================== */

export async function signUpUser({ email, password, nickname }) {
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: nickname.trim(),
          role: email.toLowerCase().includes('admin') ? 'admin' : 'user'
        }
      }
    });
    if (error) throw error;
    return data;
  }

  // Fallback local auth
  const profiles = getLocal(STORAGE_KEYS.PROFILES);
  if (profiles.some(p => p.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Este email ya está registrado.');
  }

  const newId = 'usr_' + Date.now();
  const isAdmin = email.toLowerCase().includes('admin') || nickname.toLowerCase().includes('admin');
  const newProfile = {
    id: newId,
    email: email.toLowerCase(),
    password, // For local test only
    nickname: nickname.trim(),
    avatar_url: '',
    role: isAdmin ? 'admin' : 'user',
    points: 0,
    created_at: new Date().toISOString()
  };

  profiles.push(newProfile);
  setLocal(STORAGE_KEYS.PROFILES, profiles);
  setLocal(STORAGE_KEYS.SESSION, { user: newProfile, access_token: 'local-token-' + newId });
  return { user: newProfile, session: true };
}

export async function signInUser({ email, password }) {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  // Fallback local auth
  const profiles = getLocal(STORAGE_KEYS.PROFILES);
  const found = profiles.find(p => p.email.toLowerCase() === email.toLowerCase() && p.password === password);
  if (!found) {
    throw new Error('Credenciales incorrectas o usuario no encontrado.');
  }

  setLocal(STORAGE_KEYS.SESSION, { user: found, access_token: 'local-token-' + found.id });
  return { user: found, session: true };
}

export async function signOutUser() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

export async function resetPasswordForEmail(email) {
  if (supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/perfil.html'
    });
    if (error) throw error;
    return true;
  }
  return true;
}

export async function getCurrentUser() {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      ...user,
      profile: profile || {
        id: user.id,
        email: user.email,
        nickname: user.user_metadata?.nickname || user.email.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || '',
        role: user.user_metadata?.role || 'user',
        points: 0
      }
    };
  }

  // Fallback
  const session = getLocal(STORAGE_KEYS.SESSION);
  if (session && session.user) {
    const profiles = getLocal(STORAGE_KEYS.PROFILES);
    const updated = profiles.find(p => p.id === session.user.id) || session.user;
    return {
      id: updated.id,
      email: updated.email,
      profile: updated
    };
  }
  return null;
}

export async function updateProfile({ nickname, avatar_url }) {
  const current = await getCurrentUser();
  if (!current) throw new Error('No has iniciado sesión.');

  if (supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        nickname: nickname.trim(),
        avatar_url: avatar_url || ''
      })
      .eq('id', current.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Fallback
  const profiles = getLocal(STORAGE_KEYS.PROFILES);
  const idx = profiles.findIndex(p => p.id === current.id);
  if (idx !== -1) {
    profiles[idx].nickname = nickname.trim();
    if (avatar_url !== undefined) profiles[idx].avatar_url = avatar_url;
    setLocal(STORAGE_KEYS.PROFILES, profiles);
    const session = getLocal(STORAGE_KEYS.SESSION);
    if (session) {
      session.user = profiles[idx];
      setLocal(STORAGE_KEYS.SESSION, session);
    }
    return profiles[idx];
  }
  throw new Error('Perfil no encontrado.');
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  const isAdmin = user && (user.profile?.role === 'admin' || user.email?.includes('admin'));
  if (!isAdmin) {
    throw new Error('Acceso no autorizado: requiere permisos de administrador.');
  }
  return user;
}

/* ==========================================================================
   STORAGE UPLOAD API (Avatars, News, Memes)
   ========================================================================== */

export async function uploadImage(file, bucketName = 'avatars') {
  if (!file) throw new Error('No se seleccionó ningún archivo.');

  if (supabase) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  }

  // Fallback: convert file to local data URL for preview
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Error al procesar la imagen.'));
    reader.readAsDataURL(file);
  });
}

/* ==========================================================================
   NEWS & COMMENTS API
   ========================================================================== */

export async function getNews({ category = 'all', limit = 50 } = {}) {
  if (supabase) {
    try {
      let query = supabase
        .from('news')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      if (limit) {
        query = query.limit(limit);
      }
      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {}
  }

  const news = getLocal(STORAGE_KEYS.NEWS).filter(n => n.published !== false);
  let filtered = category && category !== 'all' ? news.filter(n => n.category === category) : news;
  return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
}

export async function getNewsById(id) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) return data;
    } catch (e) {}
  }

  const news = getLocal(STORAGE_KEYS.NEWS);
  return news.find(n => n.id === id) || null;
}

export async function createNews(newsData) {
  await requireAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('news')
      .insert([newsData])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const news = getLocal(STORAGE_KEYS.NEWS);
  const item = {
    id: 'news_' + Date.now(),
    ...newsData,
    created_at: new Date().toISOString()
  };
  news.unshift(item);
  setLocal(STORAGE_KEYS.NEWS, news);
  return item;
}

export async function updateNews(id, updateData) {
  await requireAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('news')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const news = getLocal(STORAGE_KEYS.NEWS);
  const idx = news.findIndex(n => n.id === id);
  if (idx !== -1) {
    news[idx] = { ...news[idx], ...updateData };
    setLocal(STORAGE_KEYS.NEWS, news);
    return news[idx];
  }
  throw new Error('Noticia no encontrada.');
}

export async function deleteNews(id) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  let news = getLocal(STORAGE_KEYS.NEWS);
  news = news.filter(n => n.id !== id);
  setLocal(STORAGE_KEYS.NEWS, news);
  return true;
}

export async function getComments(newsId) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('news_id', newsId)
        .order('created_at', { ascending: true });
      if (!error && data) return data;
    } catch (e) {}
  }

  const comments = getLocal(STORAGE_KEYS.COMMENTS);
  return comments
    .filter(c => c.news_id === newsId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export async function addComment({ newsId, content }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para comentar.');

  const commentData = {
    news_id: newsId,
    author_id: user.id,
    author_name: user.profile?.nickname || user.email,
    author_avatar: user.profile?.avatar_url || '',
    content: content.trim(),
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('comments')
      .insert([commentData])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const comments = getLocal(STORAGE_KEYS.COMMENTS);
  const item = { id: 'com_' + Date.now(), ...commentData };
  comments.push(item);
  setLocal(STORAGE_KEYS.COMMENTS, comments);
  return item;
}

export async function deleteComment(commentId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para eliminar comentarios.');

  if (supabase) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);
    
    if (error) {
      console.error({
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      if (error.code === '42501' || error.message.includes('policy') || error.message.includes('permission')) {
        throw new Error('No se ha podido eliminar el comentario: no tienes permisos.');
      }
      throw new Error(error.message || 'No se ha podido eliminar el comentario por un error de Supabase.');
    }
    return true;
  }

  let comments = getLocal(STORAGE_KEYS.COMMENTS);
  comments = comments.filter(c => c.id !== commentId);
  setLocal(STORAGE_KEYS.COMMENTS, comments);
  return true;
}

/* ==========================================================================
   LALIGA MATCHES & RESULTS API
   ========================================================================== */

export async function getMatches({ matchday } = {}) {
  const teams = await getTeams();
  const teamMap = new Map(teams.map(t => [t.id, t]));

  if (supabase) {
    try {
      let query = supabase
        .from('matches')
        .select(`
          *,
          home:home_team_id (id, name, short_name, shield),
          away:away_team_id (id, name, short_name, shield)
        `)
        .order('match_date', { ascending: true });

      if (matchday) {
        query = query.eq('matchday', matchday);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data.map(m => {
          const homeTeam = m.home || teamMap.get(m.home_team_id) || (m.home_team ? teams.find(t => t.name.toLowerCase() === m.home_team.toLowerCase()) : null);
          const awayTeam = m.away || teamMap.get(m.away_team_id) || (m.away_team ? teams.find(t => t.name.toLowerCase() === m.away_team.toLowerCase()) : null);
          return {
            ...m,
            home_team: homeTeam ? homeTeam.name : (m.home_team || 'Equipo pendiente de vincular'),
            home_shield: homeTeam ? homeTeam.shield : (m.home_shield || ''),
            home_short_name: homeTeam ? homeTeam.short_name : '',
            away_team: awayTeam ? awayTeam.name : (m.away_team || 'Equipo pendiente de vincular'),
            away_shield: awayTeam ? awayTeam.shield : (m.away_shield || ''),
            away_short_name: awayTeam ? awayTeam.short_name : ''
          };
        });
      }
    } catch (e) {
      console.error('Error fetching matches with joins:', e);
    }
  }

  const matches = getLocal(STORAGE_KEYS.MATCHES) || [];
  const filtered = matchday ? matches.filter(m => Number(m.matchday) === Number(matchday)) : matches;
  return filtered.map(m => {
    const homeTeam = teamMap.get(m.home_team_id) || (m.home_team ? teams.find(t => t.name.toLowerCase() === m.home_team.toLowerCase()) : null);
    const awayTeam = teamMap.get(m.away_team_id) || (m.away_team ? teams.find(t => t.name.toLowerCase() === m.away_team.toLowerCase()) : null);
    return {
      ...m,
      home_team: homeTeam ? homeTeam.name : (m.home_team || 'Equipo pendiente de vincular'),
      home_shield: homeTeam ? homeTeam.shield : (m.home_shield || ''),
      home_short_name: homeTeam ? homeTeam.short_name : '',
      away_team: awayTeam ? awayTeam.name : (m.away_team || 'Equipo pendiente de vincular'),
      away_shield: awayTeam ? awayTeam.shield : (m.away_shield || ''),
      away_short_name: awayTeam ? awayTeam.short_name : ''
    };
  });
}

const CANONICAL_TEAMS = {
  'fc barcelona': 'FC Barcelona',
  'barcelona': 'FC Barcelona',
  'f.c. barcelona': 'FC Barcelona',
  'barça': 'FC Barcelona',
  'barca': 'FC Barcelona',
  'real madrid': 'Real Madrid',
  'real madrid cf': 'Real Madrid',
  'r. madrid': 'Real Madrid',
  'madrid': 'Real Madrid',
  'atletico madrid': 'Atlético de Madrid',
  'atlético de madrid': 'Atlético de Madrid',
  'atletico de madrid': 'Atlético de Madrid',
  'atlético madrid': 'Atlético de Madrid',
  'atleti': 'Atlético de Madrid',
  'athletic club': 'Athletic Club',
  'athletic bilbao': 'Athletic Club',
  'athletic club de bilbao': 'Athletic Club',
  'athletic de bilbao': 'Athletic Club',
  'athletic': 'Athletic Club',
  'villarreal cf': 'Villarreal CF',
  'villarreal': 'Villarreal CF',
  'real betis': 'Real Betis',
  'betis': 'Real Betis',
  'real betis balompie': 'Real Betis',
  'real betis balompié': 'Real Betis',
  'real sociedad': 'Real Sociedad',
  'la real': 'Real Sociedad',
  'girona fc': 'Girona FC',
  'girona': 'Girona FC',
  'rcd mallorca': 'RCD Mallorca',
  'mallorca': 'RCD Mallorca',
  'rc celta de vigo': 'RC Celta de Vigo',
  'rc celta': 'RC Celta de Vigo',
  'celta de vigo': 'RC Celta de Vigo',
  'celta': 'RC Celta de Vigo',
  'ca osasuna': 'CA Osasuna',
  'osasuna': 'CA Osasuna',
  'sevilla fc': 'Sevilla FC',
  'sevilla': 'Sevilla FC',
  'rayo vallecano': 'Rayo Vallecano',
  'rayo': 'Rayo Vallecano',
  'getafe cf': 'Getafe CF',
  'getafe': 'Getafe CF',
  'valencia cf': 'Valencia CF',
  'valencia': 'Valencia CF',
  'deportivo alaves': 'Deportivo Alavés',
  'deportivo alavés': 'Deportivo Alavés',
  'alaves': 'Deportivo Alavés',
  'alavés': 'Deportivo Alavés',
  'ud las palmas': 'UD Las Palmas',
  'las palmas': 'UD Las Palmas',
  'cd leganes': 'CD Leganés',
  'cd leganés': 'CD Leganés',
  'leganes': 'CD Leganés',
  'leganés': 'CD Leganés',
  'rcd espanyol': 'RCD Espanyol',
  'rcd espanyol de barcelona': 'RCD Espanyol',
  'espanyol de barcelona': 'RCD Espanyol',
  'espanyol': 'RCD Espanyol',
  'real valladolid': 'Real Valladolid',
  'valladolid': 'Real Valladolid',
  'fcb': 'FC Barcelona',
  'rma': 'Real Madrid',
  'atm': 'Atlético de Madrid'
};

export function normalizeTeamName(name) {
  if (!name) return '';
  const clean = name.trim().toLowerCase();
  if (CANONICAL_TEAMS[clean]) return CANONICAL_TEAMS[clean];
  const unpunct = clean.replace(/\./g, '').replace(/\s+/g, ' ');
  if (CANONICAL_TEAMS[unpunct]) return CANONICAL_TEAMS[unpunct];
  return name.trim();
}

export function normalizeMatchStatus(st) {
  if (!st) return 'scheduled';
  const s = st.toLowerCase().trim();
  if (s === 'finalizado' || s === 'finished') return 'finished';
  if (s === 'en_juego' || s === 'live' || s === 'en juego') return 'live';
  return 'scheduled';
}

/* ==========================================================================
   LALIGA TEAMS API (independent, single source of truth, real teams)
   ========================================================================== */

export const DEFAULT_LALIGA_TEAMS = [
  { name: 'FC Barcelona', short_name: 'FCB', shield: '' },
  { name: 'Real Madrid', short_name: 'RMA', shield: '' },
  { name: 'Atlético de Madrid', short_name: 'ATM', shield: '' },
  { name: 'Athletic Club', short_name: 'ATH', shield: '' },
  { name: 'Villarreal CF', short_name: 'VIL', shield: '' },
  { name: 'Real Betis', short_name: 'BET', shield: '' },
  { name: 'Real Sociedad', short_name: 'RSO', shield: '' },
  { name: 'Girona FC', short_name: 'GIR', shield: '' },
  { name: 'RCD Mallorca', short_name: 'MLL', shield: '' },
  { name: 'RC Celta de Vigo', short_name: 'CEL', shield: '' },
  { name: 'CA Osasuna', short_name: 'OSA', shield: '' },
  { name: 'Sevilla FC', short_name: 'SFC', shield: '' },
  { name: 'Rayo Vallecano', short_name: 'RAY', shield: '' },
  { name: 'Getafe CF', short_name: 'GET', shield: '' },
  { name: 'Valencia CF', short_name: 'VAL', shield: '' },
  { name: 'Deportivo Alavés', short_name: 'ALA', shield: '' },
  { name: 'UD Las Palmas', short_name: 'LPA', shield: '' },
  { name: 'CD Leganés', short_name: 'LEG', shield: '' },
  { name: 'RCD Espanyol', short_name: 'ESP', shield: '' },
  { name: 'Real Valladolid', short_name: 'VLD', shield: '' }
];

export async function seedTeamsSupabase() {
  if (!supabase) return [];
  try {
    const prepared = DEFAULT_LALIGA_TEAMS.map(t => ({
      name: t.name,
      short_name: t.short_name,
      shield: t.shield
    }));
    const { data, error } = await supabase
      .from('teams')
      .insert(prepared)
      .select();
    if (!error && data) return data;
  } catch (e) {
    console.error('Error seeding teams in Supabase:', e);
  }
  return [];
}

export async function getTeams() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });
      if (!error && data) {
        if (data.length === 0) {
          const seeded = await seedTeamsSupabase();
          if (seeded && seeded.length > 0) return seeded;
        }
        return data;
      }
    } catch (e) {
      console.warn('Could not fetch teams from Supabase, falling back to local.', e);
    }
  }

  let localTeams = getLocal(STORAGE_KEYS.TEAMS);
  if (!localTeams || localTeams.length === 0) {
    localTeams = DEFAULT_LALIGA_TEAMS.map((t, idx) => ({
      id: 'team_fallback_' + idx + '_' + Math.random().toString(36).substr(2, 9),
      name: t.name,
      short_name: t.short_name,
      shield: t.shield,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    setLocal(STORAGE_KEYS.TEAMS, localTeams);
  }
  return localTeams.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveTeam(teamData) {
  await requireAdmin();
  const name = teamData.name?.trim();
  if (!name) throw new Error('El nombre del equipo es obligatorio.');

  const canonName = normalizeTeamName(name);

  const payload = {
    name: canonName,
    short_name: teamData.short_name?.trim() || '',
    shield: teamData.shield?.trim() || '',
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    if (teamData.id) {
      const { data, error } = await supabase
        .from('teams')
        .update(payload)
        .eq('id', teamData.id)
        .select();
      if (error) {
        if (error.code === '23505') throw new Error(`El equipo "${canonName}" ya existe.`);
        throw error;
      }
      return data[0];
    } else {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          ...payload,
          created_at: new Date().toISOString()
        })
        .select();
      if (error) {
        if (error.code === '23505') throw new Error(`El equipo "${canonName}" ya existe.`);
        throw error;
      }
      return data[0];
    }
  }

  // Fallback Local Storage
  let localTeams = getLocal(STORAGE_KEYS.TEAMS);
  if (localTeams.length === 0) {
    await getTeams();
    localTeams = getLocal(STORAGE_KEYS.TEAMS);
  }

  const duplicate = localTeams.find(t => t.name.toLowerCase() === canonName.toLowerCase() && t.id !== teamData.id);
  if (duplicate) {
    throw new Error(`El equipo "${canonName}" ya existe.`);
  }

  if (teamData.id) {
    const idx = localTeams.findIndex(t => t.id === teamData.id);
    if (idx !== -1) {
      localTeams[idx] = {
        ...localTeams[idx],
        ...payload
      };
    } else {
      throw new Error('Equipo no encontrado.');
    }
    setLocal(STORAGE_KEYS.TEAMS, localTeams);
    return localTeams[idx];
  } else {
    const newTeam = {
      id: 'team_fallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      ...payload,
      created_at: new Date().toISOString()
    };
    localTeams.push(newTeam);
    setLocal(STORAGE_KEYS.TEAMS, localTeams);
    return newTeam;
  }
}

export async function deleteTeam(id) {
  await requireAdmin();
  
  const teams = await getTeams();
  const team = teams.find(t => t.id === id);
  if (!team) throw new Error('Equipo no encontrado.');

  if (supabase) {
    const { data: homeMatches } = await supabase
      .from('matches')
      .select('id')
      .or(`home_team_id.eq.${id},away_team_id.eq.${id},home_team.eq."${team.name}",away_team.eq."${team.name}"`)
      .limit(1);

    const { data: standingsRefs } = await supabase
      .from('standings')
      .select('id')
      .or(`team_id.eq.${id},team.eq."${team.name}"`)
      .limit(1);

    if ((homeMatches && homeMatches.length > 0) || (standingsRefs && standingsRefs.length > 0)) {
      throw new Error('Este equipo está siendo utilizado y no puede eliminarse hasta resolver sus referencias.');
    }

    const { error: delErr } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);
    if (delErr) throw delErr;
    return true;
  }

  const matches = getLocal(STORAGE_KEYS.MATCHES);
  const standings = getLocal(STORAGE_KEYS.STANDINGS);

  const isUsedInMatches = matches.some(m => 
    m.home_team_id === id || 
    m.away_team_id === id || 
    m.home_team.toLowerCase() === team.name.toLowerCase() || 
    m.away_team.toLowerCase() === team.name.toLowerCase()
  );

  const isUsedInStandings = standings.some(s => 
    s.team_id === id || 
    s.team.toLowerCase() === team.name.toLowerCase()
  );

  if (isUsedInMatches || isUsedInStandings) {
    throw new Error('Este equipo está siendo utilizado y no puede eliminarse hasta resolver sus referencias.');
  }

  let localTeams = getLocal(STORAGE_KEYS.TEAMS);
  localTeams = localTeams.filter(t => t.id !== id);
  setLocal(STORAGE_KEYS.TEAMS, localTeams);
  return true;
}

export async function saveMatch(matchData) {
  await requireAdmin();

  const teams = await getTeams();

  let home_team_id = matchData.home_team_id || null;
  let away_team_id = matchData.away_team_id || null;
  let home_team = matchData.home_team;
  let away_team = matchData.away_team;
  let home_shield = matchData.home_shield || '';
  let away_shield = matchData.away_shield || '';

  if (home_team_id) {
    const t = teams.find(x => x.id === home_team_id);
    if (t) {
      home_team = t.name;
      home_shield = t.shield || '';
    }
  } else if (home_team) {
    const canon = normalizeTeamName(home_team);
    const t = teams.find(x => x.name.toLowerCase() === canon.toLowerCase());
    if (t) {
      home_team_id = t.id;
      home_team = t.name;
      home_shield = t.shield || '';
    }
  }

  if (away_team_id) {
    const t = teams.find(x => x.id === away_team_id);
    if (t) {
      away_team = t.name;
      away_shield = t.shield || '';
    }
  } else if (away_team) {
    const canon = normalizeTeamName(away_team);
    const t = teams.find(x => x.name.toLowerCase() === canon.toLowerCase());
    if (t) {
      away_team_id = t.id;
      away_team = t.name;
      away_shield = t.shield || '';
    }
  }

  const payload = {
    ...matchData,
    home_team_id,
    away_team_id,
    home_team: home_team || matchData.home_team,
    away_team: away_team || matchData.away_team,
    home_shield,
    away_shield,
    status: normalizeMatchStatus(matchData.status)
  };

  // Convert empty string scores to null
  if (payload.home_score === '' || payload.home_score === undefined) payload.home_score = null;
  else if (payload.home_score !== null) payload.home_score = parseInt(payload.home_score, 10);

  if (payload.away_score === '' || payload.away_score === undefined) payload.away_score = null;
  else if (payload.away_score !== null) payload.away_score = parseInt(payload.away_score, 10);

  if (supabase) {
    if (payload.id) {
      const { data, error } = await supabase
        .from('matches')
        .update(payload)
        .eq('id', payload.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('matches')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  const matches = getLocal(STORAGE_KEYS.MATCHES);
  if (payload.id) {
    const idx = matches.findIndex(m => m.id === payload.id);
    if (idx !== -1) {
      matches[idx] = { ...matches[idx], ...payload };
      setLocal(STORAGE_KEYS.MATCHES, matches);
      return matches[idx];
    }
  }
  const newMatch = {
    id: 'mat_' + Date.now(),
    ...payload,
    created_at: new Date().toISOString()
  };
  matches.push(newMatch);
  setLocal(STORAGE_KEYS.MATCHES, matches);
  return newMatch;
}

export async function deleteMatch(id) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('matches').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  let matches = getLocal(STORAGE_KEYS.MATCHES);
  matches = matches.filter(m => m.id !== id);
  setLocal(STORAGE_KEYS.MATCHES, matches);
  return true;
}

export async function importMatchdayBatch(matchdayDataList, updateExisting = false) {
  await requireAdmin();
  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  const existingMatches = await getMatches();

  for (const item of matchdayDataList) {
    const season = item.season || '2026/2027';
    const matchday = Number(item.matchday);
    const homeTeam = normalizeTeamName(item.home_team);
    const awayTeam = normalizeTeamName(item.away_team);

    const existing = existingMatches.find(m => 
      Number(m.matchday) === matchday &&
      (m.season || '2026/2027') === season &&
      normalizeTeamName(m.home_team).toLowerCase() === homeTeam.toLowerCase() &&
      normalizeTeamName(m.away_team).toLowerCase() === awayTeam.toLowerCase()
    );

    if (existing) {
      if (updateExisting) {
        await saveMatch({
          id: existing.id,
          competition: item.competition || 'LaLiga',
          matchday,
          season,
          home_team: homeTeam,
          away_team: awayTeam,
          match_date: item.match_date,
          stadium: item.stadium || '',
          status: item.status,
          home_score: item.home_score,
          away_score: item.away_score,
          home_shield: existing.home_shield || '',
          away_shield: existing.away_shield || ''
        });
        updatedCount++;
      } else {
        skippedCount++;
      }
    } else {
      await saveMatch({
        competition: item.competition || 'LaLiga',
        matchday,
        season,
        home_team: homeTeam,
        away_team: awayTeam,
        match_date: item.match_date,
        stadium: item.stadium || '',
        status: item.status,
        home_score: item.home_score,
        away_score: item.away_score,
        home_shield: '',
        away_shield: ''
      });
      newCount++;
    }
  }

  return { newCount, updatedCount, skippedCount };
}

/* ==========================================================================
   LALIGA STANDINGS API (MANAGED SOLELY FROM SUPABASE - NO DEMO/SEED DATA)
   ========================================================================== */

export async function getStandings() {
  const teams = await getTeams();
  const teamMap = new Map(teams.map(t => [t.id, t]));

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('standings')
        .select(`
          *,
          team_ref:team_id (id, name, short_name, shield)
        `)
        .order('position', { ascending: true });
      if (!error && data) {
        return data.map(s => {
          const tRef = s.team_ref || teamMap.get(s.team_id) || (s.team ? teams.find(t => t.name.toLowerCase() === s.team.toLowerCase()) : null);
          return {
            ...s,
            team: tRef ? tRef.name : (s.team || 'Equipo pendiente de vincular'),
            shield: tRef ? tRef.shield : (s.shield || ''),
            short_name: tRef ? tRef.short_name : ''
          };
        });
      }
    } catch (e) {
      console.error('Error fetching standings with joins:', e);
    }
  }

  const standings = getLocal(STORAGE_KEYS.STANDINGS) || [];
  const mapped = standings.map(s => {
    const tRef = teamMap.get(s.team_id) || (s.team ? teams.find(t => t.name.toLowerCase() === s.team.toLowerCase()) : null);
    return {
      ...s,
      team: tRef ? tRef.name : (s.team || 'Equipo pendiente de vincular'),
      shield: tRef ? tRef.shield : (s.shield || ''),
      short_name: tRef ? tRef.short_name : ''
    };
  });
  return mapped.sort((a, b) => a.position - b.position);
}

export async function saveStandings(rows) {
  await requireAdmin();
  if (!rows || rows.length === 0) return [];

  const prepared = rows.map((r, idx) => ({
    ...r,
    team: normalizeTeamName(r.team),
    position: parseInt(r.position ?? (idx + 1), 10),
    pj: Math.max(0, parseInt(r.pj ?? 0, 10)),
    pg: Math.max(0, parseInt(r.pg ?? 0, 10)),
    pe: Math.max(0, parseInt(r.pe ?? 0, 10)),
    pp: Math.max(0, parseInt(r.pp ?? 0, 10)),
    gf: Math.max(0, parseInt(r.gf ?? 0, 10)),
    gc: Math.max(0, parseInt(r.gc ?? 0, 10)),
    dg: r.dg !== undefined && r.dg !== '' ? parseInt(r.dg, 10) : ((r.gf ?? 0) - (r.gc ?? 0)),
    points: Math.max(0, parseInt(r.points ?? 0, 10)),
    shield: r.shield || '',
    updated_at: new Date().toISOString()
  }));

  if (supabase) {
    const { data, error } = await supabase
      .from('standings')
      .upsert(prepared, { onConflict: 'team' })
      .select();
    if (error) throw error;
    return data;
  }

  setLocal(STORAGE_KEYS.STANDINGS, prepared);
  return prepared;
}

export async function saveStandingTeam(teamData) {
  await requireAdmin();

  const teams = await getTeams();
  let team_id = teamData.team_id || null;
  let teamName = teamData.team;
  let shield = teamData.shield || '';

  if (team_id) {
    const t = teams.find(x => x.id === team_id);
    if (t) {
      teamName = t.name;
      shield = t.shield || '';
    }
  } else if (teamName) {
    const canon = normalizeTeamName(teamName);
    const t = teams.find(x => x.name.toLowerCase() === canon.toLowerCase());
    if (t) {
      team_id = t.id;
      teamName = t.name;
      shield = t.shield || '';
    }
  }

  if (!teamName) throw new Error('El equipo es obligatorio.');
  if (!team_id) {
    throw new Error(`El equipo "${teamName}" no existe en la base de datos de Equipos.`);
  }

  const canonTeam = normalizeTeamName(teamName);
  const pos = parseInt(teamData.position, 10);
  if (isNaN(pos) || pos < 1) throw new Error('La posición debe ser un número entero mayor a 0.');

  const pj = Math.max(0, parseInt(teamData.pj ?? 0, 10));
  const pg = Math.max(0, parseInt(teamData.pg ?? 0, 10));
  const pe = Math.max(0, parseInt(teamData.pe ?? 0, 10));
  const pp = Math.max(0, parseInt(teamData.pp ?? 0, 10));
  const gf = Math.max(0, parseInt(teamData.gf ?? 0, 10));
  const gc = Math.max(0, parseInt(teamData.gc ?? 0, 10));
  const dg = teamData.dg !== undefined && teamData.dg !== '' ? parseInt(teamData.dg, 10) : (gf - gc);
  const points = Math.max(0, parseInt(teamData.points ?? (pg * 3 + pe), 10));

  const payload = {
    position: pos,
    team: canonTeam,
    team_id,
    shield,
    pj,
    pg,
    pe,
    pp,
    gf,
    gc,
    dg,
    points,
    updated_at: new Date().toISOString()
  };

  if (teamData.id) {
    payload.id = teamData.id;
  }

  if (supabase) {
    if (payload.id) {
      const { data, error } = await supabase
        .from('standings')
        .update(payload)
        .eq('id', payload.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('standings')
        .upsert(payload, { onConflict: 'team_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  const standings = getLocal(STORAGE_KEYS.STANDINGS);
  const idx = standings.findIndex(s => s.id === payload.id || s.team_id === team_id || normalizeTeamName(s.team) === canonTeam);
  if (idx !== -1) {
    standings[idx] = { ...standings[idx], ...payload };
  } else {
    standings.push({ id: 'std_' + Date.now(), ...payload });
  }
  standings.sort((a, b) => a.position - b.position);
  setLocal(STORAGE_KEYS.STANDINGS, standings);
  return payload;
}

export async function deleteStandingTeam(idOrTeam) {
  await requireAdmin();
  if (supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrTeam);
    const query = supabase.from('standings').delete();
    const { error } = isUuid ? await query.eq('id', idOrTeam) : await query.eq('team', idOrTeam);
    if (error) throw error;
    return true;
  }

  let standings = getLocal(STORAGE_KEYS.STANDINGS);
  standings = standings.filter(s => s.id !== idOrTeam && s.team !== idOrTeam);
  setLocal(STORAGE_KEYS.STANDINGS, standings);
  return true;
}

export async function recalculateStandingsFromMatches(season = '2026/2027') {
  await requireAdmin();

  // 1. Get all teams from public.teams as reference
  const teams = await getTeams();

  // 2. Fetch all matches for selected season
  const allMatches = await getMatches();
  const seasonMatches = allMatches.filter(m => (m.season || '2026/2027') === season);

  // 3. Filter strictly finished matches with real scores
  const finishedMatches = seasonMatches.filter(m => {
    const isFinished = m.status === 'finished' || m.status === 'finalizado';
    return isFinished && m.home_score !== null && m.away_score !== null && !isNaN(Number(m.home_score)) && !isNaN(Number(m.away_score));
  });

  // 4. Initialize statistics for ALL teams (teams without matches start with 0 stats)
  const statsMap = new Map();
  teams.forEach(t => {
    statsMap.set(t.id, {
      team_id: t.id,
      team: t.name,
      shield: t.shield || '',
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      dg: 0,
      points: 0
    });
  });

  // 5. Process all matches and attribute statistics using IDs
  for (const m of finishedMatches) {
    let homeId = m.home_team_id;
    let awayId = m.away_team_id;

    // Fallback if UUID reference is missing, lookup by normalized name
    if (!homeId && m.home_team) {
      const canon = normalizeTeamName(m.home_team);
      const t = teams.find(x => x.name.toLowerCase() === canon.toLowerCase());
      if (t) homeId = t.id;
    }
    if (!awayId && m.away_team) {
      const canon = normalizeTeamName(m.away_team);
      const t = teams.find(x => x.name.toLowerCase() === canon.toLowerCase());
      if (t) awayId = t.id;
    }

    const home = homeId ? statsMap.get(homeId) : null;
    const away = awayId ? statsMap.get(awayId) : null;

    if (home && away) {
      const hScore = Number(m.home_score);
      const aScore = Number(m.away_score);

      home.pj += 1;
      home.gf += hScore;
      home.gc += aScore;

      away.pj += 1;
      away.gf += aScore;
      away.gc += hScore;

      if (hScore > aScore) {
        home.pg += 1;
        home.points += 3;
        away.pp += 1;
      } else if (hScore === aScore) {
        home.pe += 1;
        home.points += 1;
        away.pe += 1;
        away.points += 1;
      } else {
        home.pp += 1;
        away.pg += 1;
        away.points += 3;
      }
    }
  }

  // 6. Calculate DG = GF - GC
  const computedList = Array.from(statsMap.values()).map(t => ({
    ...t,
    dg: t.gf - t.gc
  }));

  // 7. Sort: 1. Points, 2. DG, 3. GF, 4. Alphabetical
  computedList.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.localeCompare(b.team);
  });

  const finalStandings = computedList.map((t, idx) => ({
    ...t,
    position: idx + 1,
    updated_at: new Date().toISOString()
  }));

  if (supabase) {
    try {
      // Clear current standings to prevent position unique index collision
      await supabase.from('standings').delete().neq('position', -9999);
    } catch (e) {
      console.warn('Truncate standings before recalculate warning', e);
    }

    if (finalStandings.length > 0) {
      const { data, error } = await supabase.from('standings').insert(finalStandings).select();
      if (error) {
        const { data: upData, error: upErr } = await supabase.from('standings').upsert(finalStandings, { onConflict: 'team_id' }).select();
        if (upErr) throw upErr;
        return { standings: upData, finishedMatchesCount: finishedMatches.length, teamsCount: finalStandings.length };
      }
      return { standings: data, finishedMatchesCount: finishedMatches.length, teamsCount: finalStandings.length };
    }
    return { standings: [], finishedMatchesCount: 0, teamsCount: 0 };
  }

  setLocal(STORAGE_KEYS.STANDINGS, finalStandings);
  return { standings: finalStandings, finishedMatchesCount: finishedMatches.length, teamsCount: finalStandings.length };
}

export async function checkStandingsConsistency(season = '2026/2027') {
  const standings = await getStandings();
  const allMatches = await getMatches();
  const seasonMatches = allMatches.filter(m => (m.season || '2026/2027') === season);
  const finished = seasonMatches.filter(m => (m.status === 'finished' || m.status === 'finalizado') && m.home_score !== null && m.away_score !== null);

  const issues = [];
  const warnings = [];

  if (standings.length === 0) {
    return {
      valid: true,
      issues: [],
      warnings: ['La tabla de clasificación está vacía.'],
      summary: { totalTeams: 0, finishedMatches: finished.length }
    };
  }

  // 1. Check duplicate positions
  const posCounts = {};
  standings.forEach(s => {
    posCounts[s.position] = (posCounts[s.position] || 0) + 1;
  });
  Object.entries(posCounts).forEach(([pos, count]) => {
    if (count > 1) issues.push(`Posición #${pos} asignada a ${count} equipos diferentes.`);
  });

  // 2. Check duplicate team names
  const teamCounts = {};
  standings.forEach(s => {
    const canon = normalizeTeamName(s.team);
    teamCounts[canon] = (teamCounts[canon] || 0) + 1;
  });
  Object.entries(teamCounts).forEach(([tm, count]) => {
    if (count > 1) issues.push(`Equipo "${tm}" duplicado en la clasificación (${count} filas).`);
  });

  // 3. Stats verification
  standings.forEach(s => {
    const expectedDg = Number(s.gf) - Number(s.gc);
    if (Number(s.dg) !== expectedDg) {
      issues.push(`${s.team}: DG (${s.dg}) no coincide con GF (${s.gf}) - GC (${s.gc}) = ${expectedDg}.`);
    }

    const expectedPj = Number(s.pg) + Number(s.pe) + Number(s.pp);
    if (Number(s.pj) !== expectedPj) {
      issues.push(`${s.team}: PJ (${s.pj}) no coincide con PG (${s.pg}) + PE (${s.pe}) + PP (${s.pp}) = ${expectedPj}.`);
    }

    const expectedPts = Number(s.pg) * 3 + Number(s.pe);
    if (Number(s.points) !== expectedPts) {
      warnings.push(`${s.team}: Puntos registrados (${s.points}) no coinciden con PG*3 + PE (${expectedPts}).`);
    }

    // Compare with registered finished matches
    const canon = normalizeTeamName(s.team);
    const teamFinished = finished.filter(m => 
      normalizeTeamName(m.home_team) === canon || normalizeTeamName(m.away_team) === canon
    );

    if (teamFinished.length > 0 && teamFinished.length !== Number(s.pj)) {
      warnings.push(`${s.team}: Tiene PJ=${s.pj} en la tabla pero hay ${teamFinished.length} partidos finalizados registrados en la temporada ${season}.`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    summary: { totalTeams: standings.length, finishedMatches: finished.length }
  };
}

export async function importStandingsBatch(standingsList) {
  await requireAdmin();
  if (!Array.isArray(standingsList) || standingsList.length === 0) {
    throw new Error('No se han proporcionado datos de clasificación válidos.');
  }

  const cleaned = standingsList.map((item, idx) => {
    const canon = normalizeTeamName(item.team);
    const pos = parseInt(item.position || (idx + 1), 10);
    const pj = Math.max(0, parseInt(item.pj || 0, 10));
    const pg = Math.max(0, parseInt(item.pg || 0, 10));
    const pe = Math.max(0, parseInt(item.pe || 0, 10));
    const pp = Math.max(0, parseInt(item.pp || 0, 10));
    const gf = Math.max(0, parseInt(item.gf || 0, 10));
    const gc = Math.max(0, parseInt(item.gc || 0, 10));
    const dg = item.dg !== undefined && item.dg !== '' ? parseInt(item.dg, 10) : (gf - gc);
    const points = Math.max(0, parseInt(item.points !== undefined ? item.points : (pg * 3 + pe), 10));

    return {
      position: pos,
      team: canon,
      shield: item.shield?.trim() || '',
      pj,
      pg,
      pe,
      pp,
      gf,
      gc,
      dg,
      points,
      updated_at: new Date().toISOString()
    };
  });

  return await saveStandings(cleaned);
}

/* ==========================================================================
   USERS PROFILES & DASHBOARD STATS API (REAL SUPABASE COUNTS & USERS)
   ========================================================================== */

export async function getAllProfiles() {
  await requireAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (e) {}
  }
  const profiles = getLocal(STORAGE_KEYS.PROFILES);
  return profiles.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

export async function getDashboardStats() {
  await requireAdmin();
  const stats = {
    users: 0,
    news: 0,
    comments: 0,
    matches: 0,
    debates: 0,
    polls: 0,
    memes: 0,
    trivia: 0,
    teams: 0
  };

  if (supabase) {
    try {
      const [u, n, c, dc, m, d, p, me, tr, t] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('news').select('id', { count: 'exact', head: true }),
        supabase.from('comments').select('id', { count: 'exact', head: true }),
        supabase.from('debate_comments').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('id', { count: 'exact', head: true }),
        supabase.from('debates').select('id', { count: 'exact', head: true }),
        supabase.from('polls').select('id', { count: 'exact', head: true }),
        supabase.from('memes').select('id', { count: 'exact', head: true }),
        supabase.from('trivia_questions').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true })
      ]);

      stats.users = u.count || 0;
      stats.news = n.count || 0;
      stats.comments = (c.count || 0) + (dc.count || 0);
      stats.matches = m.count || 0;
      stats.debates = d.count || 0;
      stats.polls = p.count || 0;
      stats.memes = me.count || 0;
      stats.trivia = tr.count || 0;
      stats.teams = t.count || 0;
      return stats;
    } catch (e) {
      console.error('Error fetching dashboard stats from supabase', e);
    }
  }

  // Local fallback
  stats.users = getLocal(STORAGE_KEYS.PROFILES).length;
  stats.news = getLocal(STORAGE_KEYS.NEWS).length;
  stats.comments = getLocal(STORAGE_KEYS.COMMENTS).length + getLocal(STORAGE_KEYS.DEBATE_COMMENTS).length;
  stats.matches = getLocal(STORAGE_KEYS.MATCHES).length;
  stats.debates = getLocal(STORAGE_KEYS.DEBATES).length;
  stats.polls = getLocal(STORAGE_KEYS.POLLS).length;
  stats.memes = getLocal(STORAGE_KEYS.MEMES).length;
  stats.trivia = getLocal(STORAGE_KEYS.TRIVIA).length;
  stats.teams = getLocal(STORAGE_KEYS.TEAMS).length;
  return stats;
}

/* ==========================================================================
   POLLS API
   ========================================================================== */

export async function getPolls() {
  if (supabase) {
    try {
      const { data: polls, error: pErr } = await supabase
        .from('polls')
        .select('*, poll_options(*)')
        .order('created_at', { ascending: false });
      if (!pErr && polls) return polls;
    } catch (e) {}
  }

  const polls = getLocal(STORAGE_KEYS.POLLS);
  const options = getLocal(STORAGE_KEYS.POLL_OPTIONS);
  return polls.map(p => ({
    ...p,
    poll_options: options.filter(o => o.poll_id === p.id)
  }));
}

export async function votePoll({ pollId, optionId }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para votar.');

  if (supabase) {
    const { data, error } = await supabase
      .from('poll_votes')
      .insert([{
        poll_id: pollId,
        option_id: optionId,
        user_id: user.id
      }]);
    if (error) {
      if (error.code === '23505') throw new Error('Ya has votado en esta encuesta.');
      throw error;
    }
    return true;
  }

  const votes = getLocal(STORAGE_KEYS.POLL_VOTES);
  if (votes.some(v => v.poll_id === pollId && v.user_id === user.id)) {
    throw new Error('Ya has votado en esta encuesta.');
  }
  votes.push({
    id: 'pv_' + Date.now(),
    poll_id: pollId,
    option_id: optionId,
    user_id: user.id
  });
  setLocal(STORAGE_KEYS.POLL_VOTES, votes);

  // Update option count
  const options = getLocal(STORAGE_KEYS.POLL_OPTIONS);
  const opt = options.find(o => o.id === optionId);
  if (opt) {
    opt.votes_count = (opt.votes_count || 0) + 1;
    setLocal(STORAGE_KEYS.POLL_OPTIONS, options);
  }
  return true;
}

export async function hasUserVoted(pollId) {
  const user = await getCurrentUser();
  if (!user) return false;

  if (supabase) {
    const { data } = await supabase
      .from('poll_votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', user.id)
      .maybeSingle();
    return Boolean(data);
  }

  const votes = getLocal(STORAGE_KEYS.POLL_VOTES);
  return votes.some(v => v.poll_id === pollId && v.user_id === user.id);
}

export async function createPoll({ question, options }) {
  await requireAdmin();
  if (supabase) {
    const { data: poll, error: pErr } = await supabase
      .from('polls')
      .insert([{ question }])
      .select()
      .single();
    if (pErr) throw pErr;

    const optPayload = options.map(txt => ({
      poll_id: poll.id,
      option_text: txt,
      votes_count: 0
    }));

    const { error: oErr } = await supabase.from('poll_options').insert(optPayload);
    if (oErr) throw oErr;
    return poll;
  }

  const polls = getLocal(STORAGE_KEYS.POLLS);
  const allOpts = getLocal(STORAGE_KEYS.POLL_OPTIONS);
  const newPollId = 'poll_' + Date.now();
  const poll = {
    id: newPollId,
    question,
    status: 'active',
    created_at: new Date().toISOString()
  };
  polls.unshift(poll);
  setLocal(STORAGE_KEYS.POLLS, polls);

  options.forEach((txt, idx) => {
    allOpts.push({
      id: `opt_${newPollId}_${idx}`,
      poll_id: newPollId,
      option_text: txt,
      votes_count: 0
    });
  });
  setLocal(STORAGE_KEYS.POLL_OPTIONS, allOpts);
  return poll;
}

export async function closePoll(pollId) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase
      .from('polls')
      .update({ status: 'closed' })
      .eq('id', pollId);
    if (error) throw error;
    return true;
  }

  const polls = getLocal(STORAGE_KEYS.POLLS);
  const p = polls.find(i => i.id === pollId);
  if (p) {
    p.status = 'closed';
    setLocal(STORAGE_KEYS.POLLS, polls);
  }
  return true;
}

export async function deletePoll(pollId) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('polls').delete().eq('id', pollId);
    if (error) throw error;
    return true;
  }
  let polls = getLocal(STORAGE_KEYS.POLLS);
  polls = polls.filter(p => p.id !== pollId);
  setLocal(STORAGE_KEYS.POLLS, polls);
  return true;
}

/* ==========================================================================
   DEBATES (Comunidad) API
   ========================================================================== */

export async function getDebates() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('debates')
        .select('*, debate_comments(count)')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (e) {}
  }

  const debates = getLocal(STORAGE_KEYS.DEBATES);
  const comments = getLocal(STORAGE_KEYS.DEBATE_COMMENTS);
  return debates.map(d => ({
    ...d,
    comments_count: comments.filter(c => c.debate_id === d.id).length
  }));
}

export async function createDebate({ title, content }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para abrir un debate.');

  const payload = {
    title: title.trim(),
    content: content.trim(),
    author_id: user.id,
    author_name: user.profile?.nickname || user.email,
    author_avatar: user.profile?.avatar_url || '',
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('debates')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const debates = getLocal(STORAGE_KEYS.DEBATES);
  const item = { id: 'deb_' + Date.now(), ...payload };
  debates.unshift(item);
  setLocal(STORAGE_KEYS.DEBATES, debates);
  return item;
}

export async function getDebateById(id) {
  if (supabase) {
    const { data, error } = await supabase
      .from('debates')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  const debates = getLocal(STORAGE_KEYS.DEBATES);
  return debates.find(d => d.id === id) || null;
}

export async function getDebateComments(debateId) {
  if (supabase) {
    const { data, error } = await supabase
      .from('debate_comments')
      .select('*')
      .eq('debate_id', debateId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  const comments = getLocal(STORAGE_KEYS.DEBATE_COMMENTS);
  return comments.filter(c => c.debate_id === debateId);
}

export async function addDebateComment({ debateId, content }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para responder al debate.');

  const payload = {
    debate_id: debateId,
    author_id: user.id,
    author_name: user.profile?.nickname || user.email,
    author_avatar: user.profile?.avatar_url || '',
    content: content.trim(),
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('debate_comments')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const comments = getLocal(STORAGE_KEYS.DEBATE_COMMENTS);
  const item = { id: 'deb_com_' + Date.now(), ...payload };
  comments.push(item);
  setLocal(STORAGE_KEYS.DEBATE_COMMENTS, comments);
  return item;
}

export async function deleteDebateComment(commentId) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para eliminar comentarios.');

  if (supabase) {
    const { error } = await supabase
      .from('debate_comments')
      .delete()
      .eq('id', commentId);
    
    if (error) {
      console.error({
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      if (error.code === '42501' || error.message.includes('policy') || error.message.includes('permission')) {
        throw new Error('No se ha podido eliminar el comentario: no tienes permisos.');
      }
      throw new Error(error.message || 'No se ha podido eliminar el comentario por un error de Supabase.');
    }
    return true;
  }

  let comments = getLocal(STORAGE_KEYS.DEBATE_COMMENTS);
  comments = comments.filter(c => c.id !== commentId);
  setLocal(STORAGE_KEYS.DEBATE_COMMENTS, comments);
  return true;
}

export async function deleteDebate(id) {
  if (supabase) {
    const { error } = await supabase.from('debates').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  let debates = getLocal(STORAGE_KEYS.DEBATES);
  debates = debates.filter(d => d.id !== id);
  setLocal(STORAGE_KEYS.DEBATES, debates);
  return true;
}

/* ==========================================================================
   PORRAS (Predictions) API
   ========================================================================== */

export async function getPredictions({ matchId, userId } = {}) {
  const teams = await getTeams();
  const teamMap = new Map(teams.map(t => [t.id, t]));

  if (supabase) {
    try {
      let query = supabase.from('predictions').select(`
        *,
        matches (
          *,
          home:home_team_id (id, name, short_name, shield),
          away:away_team_id (id, name, short_name, shield)
        )
      `);
      if (matchId) query = query.eq('match_id', matchId);
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (!error && data) {
        return data.map(p => {
          if (!p.matches) return p;
          const m = p.matches;
          const homeTeam = m.home || teamMap.get(m.home_team_id) || (m.home_team ? teams.find(t => t.name.toLowerCase() === m.home_team.toLowerCase()) : null);
          const awayTeam = m.away || teamMap.get(m.away_team_id) || (m.away_team ? teams.find(t => t.name.toLowerCase() === m.away_team.toLowerCase()) : null);
          return {
            ...p,
            matches: {
              ...m,
              home_team: homeTeam ? homeTeam.name : (m.home_team || 'Equipo pendiente de vincular'),
              home_shield: homeTeam ? homeTeam.shield : (m.home_shield || ''),
              home_short_name: homeTeam ? homeTeam.short_name : '',
              away_team: awayTeam ? awayTeam.name : (m.away_team || 'Equipo pendiente de vincular'),
              away_shield: awayTeam ? awayTeam.shield : (m.away_shield || ''),
              away_short_name: awayTeam ? awayTeam.short_name : ''
            }
          };
        });
      }
    } catch (e) {
      console.error('Error fetching predictions with joins:', e);
    }
  }

  const predictions = getLocal(STORAGE_KEYS.PREDICTIONS) || [];
  const matches = getLocal(STORAGE_KEYS.MATCHES) || [];
  const filtered = predictions.filter(p => (!matchId || p.match_id === matchId) && (!userId || p.user_id === userId));
  return filtered.map(p => {
    const rawM = matches.find(m => m.id === p.match_id) || null;
    if (!rawM) return { ...p, matches: null };
    const homeTeam = teamMap.get(rawM.home_team_id) || (rawM.home_team ? teams.find(t => t.name.toLowerCase() === rawM.home_team.toLowerCase()) : null);
    const awayTeam = teamMap.get(rawM.away_team_id) || (rawM.away_team ? teams.find(t => t.name.toLowerCase() === rawM.away_team.toLowerCase()) : null);
    return {
      ...p,
      matches: {
        ...rawM,
        home_team: homeTeam ? homeTeam.name : (rawM.home_team || 'Equipo pendiente de vincular'),
        home_shield: homeTeam ? homeTeam.shield : (rawM.home_shield || ''),
        home_short_name: homeTeam ? homeTeam.short_name : '',
        away_team: awayTeam ? awayTeam.name : (rawM.away_team || 'Equipo pendiente de vincular'),
        away_shield: awayTeam ? awayTeam.shield : (rawM.away_shield || ''),
        away_short_name: awayTeam ? awayTeam.short_name : ''
      }
    };
  });
}

export async function submitPrediction({ matchId, homeScore, awayScore }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para participar en las porras.');

  const payload = {
    match_id: matchId,
    user_id: user.id,
    user_nickname: user.profile?.nickname || user.email,
    predicted_home_score: parseInt(homeScore, 10),
    predicted_away_score: parseInt(awayScore, 10),
    points_awarded: 0,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('predictions')
      .upsert(payload, { onConflict: 'match_id, user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const preds = getLocal(STORAGE_KEYS.PREDICTIONS);
  const existingIdx = preds.findIndex(p => p.match_id === matchId && p.user_id === user.id);
  if (existingIdx !== -1) {
    preds[existingIdx] = { ...preds[existingIdx], ...payload };
    setLocal(STORAGE_KEYS.PREDICTIONS, preds);
    return preds[existingIdx];
  } else {
    const item = { id: 'pred_' + Date.now(), ...payload };
    preds.push(item);
    setLocal(STORAGE_KEYS.PREDICTIONS, preds);
    return item;
  }
}

export async function getPorrasRanking() {
  if (supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url, points')
      .order('points', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data || [];
  }

  const profiles = getLocal(STORAGE_KEYS.PROFILES);
  return profiles
    .map(p => ({ id: p.id, nickname: p.nickname, avatar_url: p.avatar_url, points: p.points || 0 }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 20);
}

/* ==========================================================================
   TRIVIAL API
   ========================================================================== */

export async function getTriviaQuestions() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('trivia_questions')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (e) {}
  }

  return getLocal(STORAGE_KEYS.TRIVIA);
}

export async function saveTriviaQuestion(qData) {
  await requireAdmin();
  if (supabase) {
    if (qData.id) {
      const { data, error } = await supabase
        .from('trivia_questions')
        .update(qData)
        .eq('id', qData.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('trivia_questions')
        .insert([qData])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  const list = getLocal(STORAGE_KEYS.TRIVIA);
  if (qData.id) {
    const idx = list.findIndex(q => q.id === qData.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...qData };
      setLocal(STORAGE_KEYS.TRIVIA, list);
      return list[idx];
    }
  }
  const item = { id: 'triv_' + Date.now(), ...qData, created_at: new Date().toISOString() };
  list.push(item);
  setLocal(STORAGE_KEYS.TRIVIA, list);
  return item;
}

export async function deleteTriviaQuestion(id) {
  await requireAdmin();
  if (supabase) {
    const { error } = await supabase.from('trivia_questions').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  let list = getLocal(STORAGE_KEYS.TRIVIA);
  list = list.filter(q => q.id !== id);
  setLocal(STORAGE_KEYS.TRIVIA, list);
  return true;
}

export async function submitTriviaAttempt({ score, totalQuestions, correctAnswers }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const payload = {
    user_id: user.id,
    user_nickname: user.profile?.nickname || user.email,
    score,
    total_questions: totalQuestions,
    correct_answers: correctAnswers,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    await supabase.from('trivia_attempts').insert([payload]);
    // Also increment user points
    await supabase.rpc('increment_user_points', { user_id: user.id, pts: score }).catch(() => {
      // fallback direct update
      return supabase
        .from('profiles')
        .update({ points: (user.profile?.points || 0) + score })
        .eq('id', user.id);
    });
    return payload;
  }

  const attempts = getLocal(STORAGE_KEYS.TRIVIA_ATTEMPTS);
  attempts.push({ id: 'att_' + Date.now(), ...payload });
  setLocal(STORAGE_KEYS.TRIVIA_ATTEMPTS, attempts);

  // Update profile points
  const profiles = getLocal(STORAGE_KEYS.PROFILES);
  const p = profiles.find(i => i.id === user.id);
  if (p) {
    p.points = (p.points || 0) + score;
    setLocal(STORAGE_KEYS.PROFILES, profiles);
  }
  return payload;
}

export async function getTriviaLeaderboard() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('trivia_attempts')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);
      if (!error && data) return data;
    } catch (e) {}
  }

  const attempts = getLocal(STORAGE_KEYS.TRIVIA_ATTEMPTS);
  return attempts.sort((a, b) => b.score - a.score).slice(0, 10);
}

/* ==========================================================================
   MEMES API
   ========================================================================== */

export async function getMemes() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('memes')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (e) {}
  }

  return getLocal(STORAGE_KEYS.MEMES);
}

export async function createMeme({ title, imageUrl }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Debes iniciar sesión para compartir un meme.');

  const payload = {
    title: title.trim(),
    image_url: imageUrl,
    author_id: user.id,
    author_name: user.profile?.nickname || user.email,
    likes_count: 0,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('memes')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const memes = getLocal(STORAGE_KEYS.MEMES);
  const item = { id: 'meme_' + Date.now(), ...payload };
  memes.unshift(item);
  setLocal(STORAGE_KEYS.MEMES, memes);
  return item;
}

export async function likeMeme(memeId) {
  if (supabase) {
    const { data: meme } = await supabase
      .from('memes')
      .select('likes_count')
      .eq('id', memeId)
      .single();
    if (meme) {
      await supabase
        .from('memes')
        .update({ likes_count: (meme.likes_count || 0) + 1 })
        .eq('id', memeId);
    }
    return true;
  }

  const memes = getLocal(STORAGE_KEYS.MEMES);
  const m = memes.find(i => i.id === memeId);
  if (m) {
    m.likes_count = (m.likes_count || 0) + 1;
    setLocal(STORAGE_KEYS.MEMES, memes);
  }
  return true;
}

export async function deleteMeme(id) {
  if (supabase) {
    const { error } = await supabase.from('memes').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
  let memes = getLocal(STORAGE_KEYS.MEMES);
  memes = memes.filter(m => m.id !== id);
  setLocal(STORAGE_KEYS.MEMES, memes);
  return true;
}
