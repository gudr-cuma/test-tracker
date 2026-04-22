# Setup Cloudflare — Test Tracker

Runbook one-shot à dérouler dans l'ordre. Tu auras besoin :

- d'un compte Cloudflare (gratuit suffit pour commencer)
- de `wrangler` en local (déjà installé en devDep)
- du repo GitHub prêt à être poussé

## 1. Connecter wrangler au compte

```bash
npx wrangler login
```

Ouvre un navigateur, valide l'accès, revient au terminal.

## 2. Créer la base D1

```bash
npx wrangler d1 create test-tracker
```

La commande affiche un bloc TOML contenant `database_id = "xxxxx..."`.
Copie cet ID dans [`wrangler.toml`](../wrangler.toml), à la ligne `database_id = "REPLACE_ME_AFTER_D1_CREATE"`.

## 3. Appliquer les migrations en local (sandbox SQLite sur disque)

```bash
npm run d1:migrate:local
npm run d1:seed:local
```

Ça crée la DB locale sous `.wrangler/state/v3/d1`. Elle sert à `wrangler pages dev`.

## 4. Appliquer les migrations en prod (D1 Cloudflare)

```bash
npm run d1:migrate:prod
npm run d1:seed:prod
```

## 5. Pousser le repo sur GitHub

```bash
git remote add origin git@github.com:<ton-compte>/test-tracker.git
git push -u origin main
```

## 6. Créer le projet Cloudflare Pages

Dashboard Cloudflare → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git** :

- Sélectionne le repo `test-tracker`
- Framework preset : **Vite**
- Build command : `npm run build`
- Build output directory : `dist`
- Environment variables : rien pour le moment
- Valide : premier déploiement lancé

## 7. Attacher la D1 au projet Pages

Dashboard → projet Pages → **Settings** → **Functions** → **D1 database bindings** → **Add binding** :

- Variable name : `DB`
- D1 database : `test-tracker`

Applique en **Production** *et* **Preview**.

## 8. Mettre Cloudflare Access devant le site

Dashboard Cloudflare → **Zero Trust** → **Access** → **Applications** → **Add an application** → **Self-hosted** :

- Application name : `test-tracker`
- Session duration : `24 hours`
- Application domain : le domaine `.pages.dev` de ton projet (ou ton domaine custom)
- **Policy** :
  - Name : `admins`
  - Action : `Allow`
  - Rule : `Emails` → `guillaume.gudr@gmail.com`
  - Identity provider : `One-time PIN` (OTP email, zéro config)

Save.

## 9. Vérifier

1. `npm run build && npm run pages:dev` → local, pas d'Access (Access ne s'applique qu'en prod).
2. Visite l'URL `.pages.dev` en navigation privée → doit rediriger vers un écran Cloudflare Access qui demande ton email puis un code par mail.
3. Une fois authentifié, l'header `Cf-Access-Authenticated-User-Email` est disponible côté Functions (exploité par `_middleware.js` en Phase 3).

## Commandes utiles

```bash
# Inspecter la base locale en SQL
npx wrangler d1 execute test-tracker --local --command "SELECT * FROM testers"

# Inspecter la base prod
npx wrangler d1 execute test-tracker --remote --command "SELECT * FROM testers"

# Logs Functions en prod
npx wrangler pages deployment tail
```
