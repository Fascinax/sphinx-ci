# Installation de sphinx-ci sur ton repo

## Prerequis

- Un compte GitHub
- Une cle API [Anthropic](https://console.anthropic.com) (`sk-ant-...`)

---

## Etape 1 — Se connecter sur sphinx-ci

1. Va sur **https://sphinx-ci.vercel.app**
2. Clique **Se connecter avec GitHub**
3. Autorise l'application a acceder a ton compte GitHub

> L'application demande le scope `repo` pour pouvoir poster des commentaires et des status checks sur tes PRs.

---

## Etape 2 — Configurer ton repo

1. Dans le dashboard, va dans l'onglet **Repos**
2. Trouve le repo sur lequel tu veux activer sphinx-ci
3. Clique **Configurer**
4. Remplis le formulaire :

| Champ | Description | Defaut |
|-------|-------------|--------|
| **Cle Anthropic API** | Ta cle `sk-ant-...` (obligatoire) | — |
| **Questions** | Nombre de questions par quiz | 10 |
| **Score min** | Score minimum pour debloquer le merge | 70% |
| **Tentatives** | Nombre de tentatives max | 3 |
| **Langue** | Langue des questions | Francais |
| **Keyword** | Mot-cle pour declencher le quiz dans un commentaire PR | `/sphinx` |

5. Clique **Generer la cle API**
6. **Copie la cle API** affichee (format `spx_...`) — tu en auras besoin a l'etape suivante

---

## Etape 3 — Ajouter le secret et la variable dans ton repo GitHub

Va dans ton repo GitHub : **Settings > Secrets and variables > Actions**

### Secret (onglet Secrets)

Clique **New repository secret** :

| Nom | Valeur |
|-----|--------|
| `PR_QUIZ_API_KEY` | La cle `spx_...` copiee a l'etape 2 |

### Variable (onglet Variables)

Clique **New repository variable** :

| Nom | Valeur |
|-----|--------|
| `PR_QUIZ_HUB_URL` | `https://sphinx-ci.vercel.app` |

> `GITHUB_TOKEN` est fourni automatiquement par GitHub Actions, rien a configurer.

---

## Etape 4 — Ajouter le workflow GitHub Action

Cree le fichier `.github/workflows/pr-quiz.yml` dans ton repo :

```yaml
name: PR Quiz

on:
  issue_comment:
    types: [created]

permissions:
  contents: read
  pull-requests: write
  statuses: write

jobs:
  quiz:
    if: github.event.issue.pull_request && contains(github.event.comment.body, '/sphinx')
    runs-on: ubuntu-latest
    steps:
      - name: Get PR details
        id: pr
        uses: actions/github-script@v7
        with:
          script: |
            const pr = await github.rest.pulls.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
            });
            core.setOutput('head_sha', pr.data.head.sha);
            core.setOutput('base_sha', pr.data.base.sha);
            core.setOutput('title', pr.data.title);

      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set pending status
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.repos.createCommitStatus({
              owner: context.repo.owner,
              repo: context.repo.repo,
              sha: '${{ steps.pr.outputs.head_sha }}',
              state: 'pending',
              context: 'pr-quiz',
              description: 'Quiz en attente...',
            });

      - name: Send diff to hub & post comment
        env:
          PR_QUIZ_API_KEY: ${{ secrets.PR_QUIZ_API_KEY }}
          PR_QUIZ_HUB_URL: ${{ vars.PR_QUIZ_HUB_URL }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          HEAD_SHA="${{ steps.pr.outputs.head_sha }}"
          BASE_SHA="${{ steps.pr.outputs.base_sha }}"
          PR_TITLE="${{ steps.pr.outputs.title }}"
          PR_NUMBER="${{ github.event.issue.number }}"

          DIFF=$(git diff ${BASE_SHA}...${HEAD_SHA} \
            -- '*.js' '*.ts' '*.jsx' '*.tsx' '*.py' '*.go' '*.java' '*.rs' '*.rb' '*.php' '*.cs' '*.cpp' \
            | head -c 12000)

          FILES=$(git diff --name-only ${BASE_SHA}...${HEAD_SHA} | tr '\n' ',' | sed 's/,$//')

          RESPONSE=$(curl -sf -X POST "$PR_QUIZ_HUB_URL/api/quiz" \
            -H "Content-Type: application/json" \
            -H "X-API-Key: $PR_QUIZ_API_KEY" \
            -d "{
              \"repo\": \"${{ github.repository }}\",
              \"pr_number\": ${PR_NUMBER},
              \"head_sha\": \"${HEAD_SHA}\",
              \"pr_title\": $(echo "$PR_TITLE" | jq -Rs .),
              \"diff\": $(echo "$DIFF" | jq -Rs .),
              \"files_changed\": $(echo "$FILES" | jq -Rs 'split(",")'),
              \"callback_token\": \"$GITHUB_TOKEN\"
            }")

          QUIZ_URL=$(echo $RESPONSE | jq -r '.quiz_url')
          SKIPPED=$(echo $RESPONSE | jq -r '.skipped // false')

          if [ "$SKIPPED" = "true" ]; then
            echo "No code changes, skipping quiz."
            curl -sf -X POST "https://api.github.com/repos/${{ github.repository }}/statuses/${HEAD_SHA}" \
              -H "Authorization: token $GITHUB_TOKEN" \
              -H "Accept: application/vnd.github.v3+json" \
              -d '{"state":"success","context":"pr-quiz","description":"Pas de changement de code — quiz ignore"}'
            exit 0
          fi

          gh pr comment ${PR_NUMBER} --body "## Quiz de comprehension requis

          Pour debloquer le merge, complete ce quiz sur ton code.

          [$QUIZ_URL]($QUIZ_URL)

          *Le Sphinx attend ta reponse.*"
```

Commit et push ce fichier sur la branche principale de ton repo.

---

## Etape 5 (optionnel) — Activer la branch protection

Pour que le quiz **bloque reellement** le merge :

1. Dans ton repo : **Settings > Branches**
2. Clique **Add branch protection rule** (ou edite la regle existante)
3. Branch name pattern : `main` (ou `master`)
4. Coche **Require status checks to pass before merging**
5. Cherche et ajoute le status check : **`pr-quiz`**
6. Sauvegarde

> Sans cette etape, le quiz sera informatif mais ne bloquera pas le merge.

---

## Utilisation

1. Un developpeur ouvre une PR sur ton repo
2. Quelqu'un commente **`/sphinx`** sur la PR
3. Le Sphinx genere un quiz et poste un commentaire avec le lien
4. Le developpeur repond au quiz
5. Resultat poste en commentaire sur la PR :
   - **Reussi** → status check `success`, merge debloque
   - **Echoue** → lien pour reessayer (si tentatives restantes)
   - **Toutes tentatives epuisees** → status check `failure`, merge bloque

---

## Modifier la configuration

Tu peux modifier les parametres d'un repo deja configure :

1. Va dans **Dashboard > Repos**
2. Clique **Modifier** sur le repo
3. Change les parametres (cle Anthropic, nombre de questions, etc.)
4. Clique **Sauvegarder**

Tu peux aussi :
- **Reset cle** — genere une nouvelle cle API (l'ancienne est invalidee)
- **Revoquer** — supprime la configuration et les quiz associes

---

## Depannage

### Le workflow ne se declenche pas
- Verifie que le fichier `.github/workflows/pr-quiz.yml` est bien sur la branche principale
- Verifie que le commentaire contient exactement le keyword configure (defaut : `/sphinx`)
- Le workflow ne reagit qu'aux commentaires sur les PRs, pas sur les issues

### Erreur `exit code 22` dans les logs du workflow
- Verifie que `PR_QUIZ_API_KEY` est bien un secret du repo (pas une variable)
- Verifie que `PR_QUIZ_HUB_URL` est bien une variable du repo (valeur : `https://sphinx-ci.vercel.app`)
- Verifie que la cle API est valide (pas revoquee)

### Erreur `exit code 7` dans les logs du workflow
- `PR_QUIZ_HUB_URL` est probablement `http://localhost:3000` au lieu de l'URL Vercel

### Le quiz est genere mais pas de commentaire de resultat sur la PR
- Deconnecte-toi et reconnecte-toi sur sphinx-ci pour rafraichir le token GitHub
- Le token OAuth doit avoir le scope `repo`

### `undefined` dans l'URL du quiz
- Verifie que `NEXT_PUBLIC_APP_URL` est set dans les variables d'environnement Vercel
