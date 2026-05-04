CREATE TABLE IF NOT EXISTS facts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id    VARCHAR(64)  NOT NULL,
    subject     TEXT         NOT NULL,
    predicate   TEXT         NOT NULL,
    object      JSONB        NOT NULL,
    confidence  DOUBLE PRECISION NOT NULL DEFAULT 1.0
                CHECK (confidence BETWEEN 0.0 AND 1.0),
    source      VARCHAR(16)  NOT NULL DEFAULT 'self'
                CHECK (source IN ('self', 'rumor', 'observation')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_facts_agent_predicate
    ON facts (agent_id, predicate);

CREATE INDEX IF NOT EXISTS idx_facts_expires
    ON facts (expires_at)
    WHERE expires_at IS NOT NULL;
