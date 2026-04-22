-- Seed initial tester. Email matches the Cloudflare Access identity
-- so the middleware resolves requests to this tester automatically.
INSERT INTO testers (id, name, email, active)
VALUES ('tester-guillaume', 'Guillaume', 'guillaume.gudr@gmail.com', 1);
