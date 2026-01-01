-- =============================================
-- TABLES POUR LE SUIVI DES RUES
-- Execute ce SQL dans le SQL Editor de Supabase
-- =============================================

-- Table des rues (importees depuis OpenStreetMap)
CREATE TABLE IF NOT EXISTS streets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  osm_id BIGINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  arrondissement INTEGER NOT NULL CHECK (arrondissement >= 1 AND arrondissement <= 20),
  geometry JSONB NOT NULL,
  street_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_streets_arrondissement ON streets(arrondissement);
CREATE INDEX IF NOT EXISTS idx_streets_name_normalized ON streets(name_normalized);
CREATE INDEX IF NOT EXISTS idx_streets_osm_id ON streets(osm_id);

-- Table des actions par rue
CREATE TABLE IF NOT EXISTS street_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  street_id UUID NOT NULL REFERENCES streets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('tractage', 'porte_a_porte', 'affichage')),
  statut TEXT NOT NULL DEFAULT 'non_fait' CHECK (statut IN ('non_fait', 'fait')),
  responsable_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(street_id, type)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_street_actions_street_id ON street_actions(street_id);
CREATE INDEX IF NOT EXISTS idx_street_actions_type ON street_actions(type);
CREATE INDEX IF NOT EXISTS idx_street_actions_statut ON street_actions(statut);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Activer RLS
ALTER TABLE streets ENABLE ROW LEVEL SECURITY;
ALTER TABLE street_actions ENABLE ROW LEVEL SECURITY;

-- Streets: Lecture pour tous les utilisateurs authentifies
CREATE POLICY "Authenticated users can view all streets"
  ON streets FOR SELECT
  TO authenticated
  USING (true);

-- Street Actions: Lecture pour tous
CREATE POLICY "Authenticated users can view all street_actions"
  ON street_actions FOR SELECT
  TO authenticated
  USING (true);

-- Street Actions: Insert par admins et responsables de l'arrondissement
CREATE POLICY "Users can insert street_actions for their arrondissements"
  ON street_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR EXISTS (
          SELECT 1 FROM streets s
          WHERE s.id = street_actions.street_id
          AND s.arrondissement::text = ANY(string_to_array(p.arrondissement, ','))
        )
      )
    )
  );

-- Street Actions: Update par admins et responsables
CREATE POLICY "Users can update street_actions for their arrondissements"
  ON street_actions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR EXISTS (
          SELECT 1 FROM streets s
          WHERE s.id = street_actions.street_id
          AND s.arrondissement::text = ANY(string_to_array(p.arrondissement, ','))
        )
      )
    )
  );

-- =============================================
-- FONCTION POUR METTRE A JOUR updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_street_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_street_actions_updated_at
  BEFORE UPDATE ON street_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_street_actions_updated_at();
