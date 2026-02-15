-- Active la diffusion (publication) Realtime pour la table `content`
-- Exécute ce SQL dans Supabase : Dashboard > SQL Editor > New query

-- Définit l'identité de réplication (utile si la table n'a pas de PK explicite)
ALTER TABLE IF EXISTS public.content REPLICA IDENTITY FULL;

-- Crée la publication `supabase_realtime` si elle n'existe pas, sinon ajoute la table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.content;
  ELSE
    BEGIN
      -- Essayer d'ajouter la table (ignorer l'erreur si déjà ajoutée)
      ALTER PUBLICATION supabase_realtime ADD TABLE public.content;
    EXCEPTION WHEN duplicate_object THEN
      -- already added, ignore
    END;
  END IF;
END
$$;

-- Optionnel : Vider le cache du client (si tu as besoin d'une mise à jour immédiate côté client)
-- INSERT INTO public.content (type, title, video_url) VALUES ('film', 'test-realtime', 'https://example.com/video.mp4');

-- Note: si tu es sur Supabase Cloud, la publication `supabase_realtime` existe normalement.
-- Exécute ce script puis teste : ajoute une série via l'admin et vérifie dans plusieurs onglets/navigateurs.
