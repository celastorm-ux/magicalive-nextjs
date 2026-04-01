-- Co-performers on a show: many-to-many between shows and magician profiles
CREATE TABLE IF NOT EXISTS show_performers (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id    UUID        NOT NULL REFERENCES shows(id)    ON DELETE CASCADE,
  magician_id TEXT       NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  added_by   TEXT        REFERENCES profiles(id)          ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(show_id, magician_id)
);

CREATE INDEX IF NOT EXISTS show_performers_show_id_idx     ON show_performers(show_id);
CREATE INDEX IF NOT EXISTS show_performers_magician_id_idx ON show_performers(magician_id);

ALTER TABLE show_performers ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "show_performers_select" ON show_performers
  FOR SELECT USING (true);

-- Any authenticated user can insert (app-level auth via Clerk handles ownership)
CREATE POLICY "show_performers_insert" ON show_performers
  FOR INSERT WITH CHECK (true);

-- Any authenticated user can delete (app ensures only show owner can do so)
CREATE POLICY "show_performers_delete" ON show_performers
  FOR DELETE USING (true);
