-- ============================================
-- SCRIPT DE CONFIGURATION SUPABASE
-- Outil de Tractage Paris 2026
-- ============================================

-- 1. Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  nom TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'responsable' CHECK (role IN ('admin', 'responsable')),
  arrondissements INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table des actions de terrain
CREATE TABLE IF NOT EXISTS actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  arrondissement INTEGER NOT NULL CHECK (arrondissement >= 1 AND arrondissement <= 20),
  type TEXT NOT NULL CHECK (type IN ('tractage', 'porte_a_porte', 'affichage')),
  statut TEXT NOT NULL DEFAULT 'non_commence' CHECK (statut IN ('non_commence', 'en_cours', 'termine')),
  pourcentage INTEGER NOT NULL DEFAULT 0 CHECK (pourcentage >= 0 AND pourcentage <= 100),
  responsable_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(arrondissement, type)
);

-- 3. Row Level Security (RLS)

-- Activer RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

-- Politiques pour profiles
CREATE POLICY "Les utilisateurs peuvent voir tous les profils"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les admins peuvent tout modifier sur profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Politiques pour actions
CREATE POLICY "Tout le monde peut voir les actions"
  ON actions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les admins peuvent tout faire sur actions"
  ON actions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Les responsables peuvent modifier leurs arrondissements"
  ON actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND arrondissement = ANY(profiles.arrondissements)
    )
  );

CREATE POLICY "Les responsables peuvent update leurs arrondissements"
  ON actions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND arrondissement = ANY(profiles.arrondissements)
    )
  );

-- 4. Trigger pour créer automatiquement un profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nom', ''), 'responsable');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Créer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER actions_updated_at
  BEFORE UPDATE ON actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DONNÉES INITIALES (optionnel)
-- ============================================

-- Pour créer un premier admin, après avoir créé un utilisateur via l'interface:
-- UPDATE profiles SET role = 'admin' WHERE email = 'votre@email.com';
