import { supabase } from './supabaseClient';
export async function fetchVisitedCountries() {
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toAppFormat);
}

/**
 * Отримати одну країну за country_code.
 */
export async function fetchCountryByCode(countryCode) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .eq('user_id', user.id)
    .eq('country_code', countryCode)
    .maybeSingle();

  if (error) throw error;
  return data ? toAppFormat(data) : null;
}

export async function upsertCountry(country) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const payload = {
    user_id: user.id,
    country_code: country.id, // у нашому застосунку id - це ISO-код
    name: country.name,
    continent: country.continent || '',
    visited: !!country.visited,
    is_dream: !!country.isDream,
    date_visited: country.dateVisited
      ? (country.dateVisited instanceof Date
          ? country.dateVisited.toISOString()
          : country.dateVisited)
      : null,
    note: country.note || '',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('countries')
    .upsert(payload, { onConflict: 'user_id,country_code' })
    .select()
    .single();

  if (error) throw error;
  return toAppFormat(data);
}

// ============================================================
// DELETE
// ============================================================

export async function deleteCountry(countryCode) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('countries')
    .delete()
    .eq('user_id', user.id)
    .eq('country_code', countryCode);

  if (error) throw error;
  return true;
}

// ============================================================
// LEGACY ALIASES — для сумісності з існуючими репозиторіями
// ============================================================

export async function fetchAllCountries() {
  return fetchVisitedCountries();
}

export async function postVisitedCountry(country) {
  return upsertCountry(country);
}

export async function deleteVisitedCountry(id) {
  return deleteCountry(id);
}

export async function putVisitedCountry(id, updates) {
  return upsertCountry({ id, ...updates });
}

export async function fetchCountryById(id) {
  return fetchCountryByCode(id);
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Конвертація з формату Supabase (snake_case) у формат застосунку (camelCase).
 */
function toAppFormat(row) {
  return {
    id: row.country_code,           // у застосунку id = ISO-код
    name: row.name,
    continent: row.continent || '',
    visited: !!row.visited,
    isDream: !!row.is_dream,
    dateVisited: row.date_visited ? new Date(row.date_visited) : null,
    note: row.note || '',
    syncStatus: 'synced',           // якщо прийшло з сервера — значить синхронізовано
    _supabaseId: row.id,            // зберігаємо UUID на випадок якщо знадобиться
  };
}