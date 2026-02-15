-- Ajoute la colonne episodes pour les séries (structure Netflix)
-- Exécute dans Supabase > SQL Editor

ALTER TABLE content ADD COLUMN IF NOT EXISTS episodes JSONB DEFAULT '[]';
