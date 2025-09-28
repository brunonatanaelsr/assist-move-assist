CREATE TABLE IF NOT EXISTS job_queue (
    id BIGSERIAL PRIMARY KEY,
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    prioridade INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    tentativas INTEGER NOT NULL DEFAULT 0,
    max_tentativas INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_status_prioridade
    ON job_queue (status, prioridade DESC, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_job_queue_pending_scheduled
    ON job_queue (scheduled_at)
    WHERE status = 'pending';

CREATE OR REPLACE FUNCTION set_job_queue_updated_at()
RETURNS TRIGGER AS
$$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_queue_set_updated_at ON job_queue;
CREATE TRIGGER trg_job_queue_set_updated_at
    BEFORE UPDATE ON job_queue
    FOR EACH ROW
    EXECUTE FUNCTION set_job_queue_updated_at();

CREATE OR REPLACE FUNCTION cleanup_old_jobs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS
$$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM job_queue
        WHERE status IN ('completed', 'failed', 'cancelled')
          AND COALESCE(executed_at, updated_at, created_at) < NOW() - (retention_days || ' days')::interval
        RETURNING 1
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;

    RETURN COALESCE(deleted_count, 0);
END;
$$ LANGUAGE plpgsql;
