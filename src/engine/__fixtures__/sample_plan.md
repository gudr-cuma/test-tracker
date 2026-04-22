# Cahier de test — Module démo

## 1. Contexte

Ce cahier sert de fixture pour les tests unitaires du parseur. Il couvre :

- un titre H1
- deux familles (INIT, AUTH)
- une cellule avec pipe échappé
- des préconditions multi-lignes via `<br>`

## 2. Cas de test

### 2.1 TC-INIT — Initialisation

| ID | Titre | Préconditions | Étapes | Résultat attendu | Priorité |
|---|---|---|---|---|---|
| TC-INIT-01 | Premier lancement | Aucune | Ouvrir l'appli | Page d'accueil visible | P1 |
| TC-INIT-02 | Reprise session | Session active | Relancer l'appli | État restauré | P2 |

### 2.2 TC-AUTH — Authentification

| ID | Titre | Préconditions | Étapes | Résultat attendu | Priorité |
|---|---|---|---|---|---|
| TC-AUTH-01 | Login OK | User créé | Saisir email \| mot de passe | Dashboard affiché | P1 |
| TC-AUTH-02 | Login KO | User inexistant | Saisir email bidon<br>Valider | Message d'erreur | P2 |

## 3. Points d'attention

Cette section doit être ignorée par le parseur.
