# Contribuer à PoleWin

> ⚠️ Ces règles sont des **conventions d'équipe**. Elles ne sont pas (encore) forcées techniquement
> par GitHub : la protection de branche nécessite un plan **GitHub Team** sur repos privés.
> En attendant, **on s'engage à les respecter tous les deux**.

## 🌳 Modèle de branches

```
feature/ma-feature  ─┐
feature/autre-truc  ─┼──►  develop  ──►  main (PROD uniquement)
classement          ─┘
```

- **`main`** : uniquement ce qui part en **production**. On ne pousse JAMAIS directement dessus.
- **`develop`** : branche d'intégration. C'est ici qu'on merge toutes les features.
- **`feature/*`** : une branche par feature, créée **depuis `develop`**.

## 🔁 Workflow

1. Partir de `develop` à jour :
   ```bash
   git checkout develop && git pull
   git checkout -b feature/ma-feature
   ```
2. Bosser, committer, pousser sa branche.
3. Ouvrir une **Pull Request** `feature/ma-feature` → **`develop`** (jamais vers `main`).
4. **Faire reviewer par l'autre dev.** ❌ On ne merge JAMAIS sa propre PR sans review.
5. Une fois `develop` stable et testé → PR **`develop`** → **`main`** pour la mise en prod.

## ✅ Règles d'or

- ❌ Pas de push direct sur `main` ni `develop`.
- ❌ Pas d'auto-review : la personne qui écrit la PR ne l'approuve pas elle-même.
- ✅ Toujours passer par une Pull Request.
- ✅ Au moins **1 review** de l'autre membre avant merge.
- ✅ La branche doit être à jour avec `develop` avant merge (résoudre les conflits chez soi).

## 🏷️ Convention de nommage des branches

- `feature/xxx` — nouvelle fonctionnalité
- `fix/xxx` — correction de bug
- `chore/xxx` — config, outillage, docs
