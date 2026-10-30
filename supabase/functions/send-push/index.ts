// Luna : envoi des notifications Web Push aux téléphones abonnés.
// Appelée uniquement par la base de données (private.notify), avec un mot de passe partagé.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

interface Config {
  push_secret: string | null;
  vapid_public: string | null;
  vapid_private: string | null;
}

let config: Config | null = null;
async function getConfig(): Promise<Config> {
  if (config) return config;
  const { data, error } = await supabase.rpc('push_config');
  if (error) throw new Error(error.message);
  config = data as Config;
  return config;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST uniquement' });

  const cfg = await getConfig();
  const secret = req.headers.get('x-luna-secret');
  if (!cfg.push_secret || !secret || secret !== cfg.push_secret) return json(401, { error: 'Non autorisé' });
  if (!cfg.vapid_public || !cfg.vapid_private) return json(500, { error: 'Clés VAPID manquantes' });

  const { user_id, title, body, url, tag, category } = await req.json();
  if (!user_id || !title) return json(400, { error: 'Données manquantes' });

  webpush.setVapidDetails('https://luna-paiement.netlify.app', cfg.vapid_public, cfg.vapid_private);

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', user_id);
  if (error) return json(500, { error: error.message });

  const payload = JSON.stringify({ title, body, url: url || '/', tag, category });
  // Un appel n'a plus d'intérêt après la sonnerie ; un message reste utile un jour
  const ttl = category === 'calls' ? 45 : 86400;
  let sent = 0;
  const expired: string[] = [];

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: ttl, urgency: category === 'calls' ? 'high' : 'normal' },
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // Abonnement expiré ou supprimé côté téléphone : on l'oublie
        if (status === 404 || status === 410) expired.push(s.id);
        else console.error('Envoi impossible', status, (e as Error).message);
      }
    }),
  );

  if (expired.length) await supabase.from('push_subscriptions').delete().in('id', expired);
  return json(200, { sent, expired: expired.length });
});
