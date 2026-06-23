-- Seed WireAgent system user used by the doc-import pipeline.
-- Password is set to a disabled sentinel ('!disabled') — it will never match any bcrypt.compare call.
-- Set the real password via environment after deploy:
--   UPDATE users SET password = '<bcrypt-hash-from-env>' WHERE username = 'WireAgent';
INSERT INTO users (username, password, role, is_active, first_name, last_name, created_at, updated_at)
VALUES (
    'WireAgent',
    '!disabled',
    'USER',
    false,
    'Wire',
    'Agent',
    NOW(),
    NOW()
)
ON CONFLICT (username) DO NOTHING;
