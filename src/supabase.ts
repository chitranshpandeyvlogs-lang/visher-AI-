import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

dotenv.config({ path: path.resolve(__dirname, isProd ? '../.env.prod' : '../.env.dev') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured');
}

let supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient(supabaseUrl!, supabaseKey!);
  }
  return supabase;
}

// Store journal entries
export async function saveJournalEntry(userId: string, entry: {
  text: string;
  insight: any;
  theme?: string;
  createdAt?: Date;
}) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('journal_entries')
      .insert([
        {
          user_id: userId,
          entry_text: entry.text,
          insight: entry.insight,
          theme: entry.theme,
          created_at: entry.createdAt || new Date().toISOString(),
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error('Error saving journal entry:', err);
    return { success: false, error: err.message };
  }
}

// Get user's journal entries
export async function getUserJournalEntries(userId: string, limit = 50) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error('Error fetching journal entries:', err);
    return { success: false, error: err.message };
  }
}

// Cache insights in Supabase (alternative to Redis)
export async function cacheInsight(entryHash: string, insight: any, ttlHours = 24) {
  try {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    const { error } = await getSupabaseClient()
      .from('insight_cache')
      .insert([
        {
          entry_hash: entryHash,
          insight: insight,
          expires_at: expiresAt,
        }
      ])
      .on('*', payload => {
        // Cleanup old cache entries
      });

    if (error && !error.message.includes('duplicate')) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error caching insight:', err);
    return { success: false, error: err.message };
  }
}

// Get cached insight
export async function getCachedInsight(entryHash: string) {
  try {
    const now = new Date().toISOString();

    const { data, error } = await getSupabaseClient()
      .from('insight_cache')
      .select('insight')
      .eq('entry_hash', entryHash)
      .gt('expires_at', now)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows found - not an error
      return { success: true, data: null };
    }

    if (error) throw error;
    return { success: true, data: data?.insight };
  } catch (err: any) {
    console.error('Error getting cached insight:', err);
    return { success: false, error: err.message };
  }
}

// Store API usage for analytics
export async function recordApiUsage(userId: string, endpoint: string, responseTime: number) {
  try {
    await getSupabaseClient()
      .from('api_usage')
      .insert([
        {
          user_id: userId,
          endpoint: endpoint,
          response_time_ms: responseTime,
          created_at: new Date().toISOString(),
        }
      ]);
  } catch (err: any) {
    console.warn('Error recording API usage:', err.message);
    // Non-critical, don't throw
  }
}

// Get user by ID
export async function getUser(userId: string) {
  try {
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error('Error fetching user:', err);
    return { success: false, error: err.message };
  }
}
