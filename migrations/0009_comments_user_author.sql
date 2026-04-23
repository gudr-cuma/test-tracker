-- Rattache les commentaires aux utilisateurs (table users) plutôt qu'aux
-- testers (ancienne table). La colonne author_id (FK → testers) est conservée
-- pour la rétrocompatibilité avec les commentaires créés avant cette migration.
ALTER TABLE comments ADD COLUMN user_author_id TEXT REFERENCES users(id) ON DELETE SET NULL;
