-- Seed WireAgent system user used by the doc-import pipeline.
-- Uses ON CONFLICT DO NOTHING so re-running is safe.
INSERT INTO users (username, password, role, is_active, first_name, last_name, created_at, updated_at)
VALUES (
    'WireAgent',
    '$2a$12$6Xv1GEzc5/AcZGb8GtAtNexskAIDpsT3Ky.pkhC3SG9E4LAFzDX2y',
    'USER',
    true,
    'Wire',
    'Agent',
    NOW(),
    NOW()
)
ON CONFLICT (username) DO NOTHING;
