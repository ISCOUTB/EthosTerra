CREATE TABLE IF NOT EXISTS episodes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id    VARCHAR(64)  NOT NULL,
    sim_time    BIGINT       NOT NULL,
    real_time   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    text        TEXT         NOT NULL,
    source      VARCHAR(16)  NOT NULL DEFAULT 'self'
                             CHECK (source IN ('self', 'rumor', 'observation')),
    tags        TEXT[]       NOT NULL DEFAULT '{}',
    embedding   vector(384),
    metadata    JSONB        NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_episodes_agent_time
    ON episodes (agent_id, sim_time DESC);

CREATE INDEX IF NOT EXISTS idx_episodes_tags
    ON episodes USING GIN (tags);

-- HNSW index for fast approximate nearest-neighbour search (Stage 3)
CREATE INDEX IF NOT EXISTS idx_episodes_embedding_hnsw
    ON episodes USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
