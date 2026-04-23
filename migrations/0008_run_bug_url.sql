-- URL du ticket sprint associé à un run (saisie libre, visible quand status=bug ou evolution).
ALTER TABLE runs ADD COLUMN bug_url TEXT;
