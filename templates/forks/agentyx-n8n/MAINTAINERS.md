# Maintainer Notes

## Upstream sync

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

## Apply our patch

```bash
git checkout agentyx/main
git merge main
# resolve conflicts
```

## Deploy

Railway tracks `agentyx/main`; auto-deploy on push.
