CREATE TABLE IF NOT EXISTS experiment_runs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    config          JSONB       NOT NULL DEFAULT '{}',
    model_hash      VARCHAR(64),
    notes           TEXT
);

CREATE TABLE IF NOT EXISTS experiment_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id          UUID        NOT NULL REFERENCES experiment_runs(id) ON DELETE CASCADE,
    agent_id        VARCHAR(64) NOT NULL,
    sim_time        BIGINT      NOT NULL,
    snapshot_time   TIMESTAMPTZ NOT NULL DEFAULT now(),
    beliefs         JSONB       NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_snapshots_run_agent
    ON experiment_snapshots (run_id, agent_id, sim_time DESC);
