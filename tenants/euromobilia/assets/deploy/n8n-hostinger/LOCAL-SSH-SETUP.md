# Local SSH setup (Hostinger VPS)

**Do not commit** private keys, `.env`, or key material into this repository.

## 1. Key pair on your machine

```bash
ssh-keygen -t ed25519 -C "agentyx-vps" -f ~/.ssh/agentyx-vps
chmod 600 ~/.ssh/agentyx-vps
```

- **Public key** (`~/.ssh/agentyx-vps.pub`): add in Hostinger hPanel → SSH Keys for the VPS.
- **Private key** (`~/.ssh/agentyx-vps`): keep local only; use as CI/CD secret if ever needed, never in Git.

## 2. Optional `~/.ssh/config` snippet

```sshconfig
Host agentyx-vps
  HostName 187.127.252.161
  User root
  IdentityFile ~/.ssh/agentyx-vps
  IdentitiesOnly yes
```

Adjust `User` if Hostinger uses a non-root default.

## 3. Key rotation (recommended if a private key was ever pasted into chat)

1. Generate a new key pair (new `-f` path).
2. Add the **new** public key in hPanel before removing the old one.
3. Verify login with the new key, then remove the old public key from the server `~/.ssh/authorized_keys` if applicable.

## 4. First connection

```bash
ssh agentyx-vps
# or
ssh -i ~/.ssh/agentyx-vps root@187.127.252.161
```

Then follow [README.md](README.md) for Docker and n8n deployment.
