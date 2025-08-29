CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start TIMESTAMPTZ NOT NULL,
  "end" TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  type VARCHAR(20) DEFAULT 'OUTRO',
  status VARCHAR(20) DEFAULT 'AGENDADO',
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_event_participants (
  event_id INTEGER REFERENCES calendar_events(id) ON DELETE CASCADE,
  participant_id INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'TENTATIVE',
  attended BOOLEAN DEFAULT FALSE,
  PRIMARY KEY(event_id, participant_id)
);

CREATE OR REPLACE FUNCTION trg_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calendar_updated_at ON calendar_events;
CREATE TRIGGER trigger_calendar_updated_at
BEFORE UPDATE ON calendar_events
FOR EACH ROW EXECUTE FUNCTION trg_calendar_updated_at();

