#!/usr/bin/env bash
#
# harden-ssh.sh — turn off password authentication and root login.
#
#   sudo bash harden-ssh.sh
#
# Run this LAST, and only from a session that is already authenticating with a
# key. It refuses to run otherwise, because the failure mode is losing access
# to the box.
#
# MIGRATION-PLAN.md §4.1.

set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "run with sudo" >&2; exit 1; }

ADMIN_USER="${SUDO_USER:-mikiyas}"
AUTH_KEYS="$(getent passwd "$ADMIN_USER" | cut -d: -f6)/.ssh/authorized_keys"

# Guard: there must be a key to fall back on, or this is a lockout.
if [ ! -s "$AUTH_KEYS" ]; then
  echo "REFUSING: $AUTH_KEYS is missing or empty." >&2
  echo "Install your public key and confirm 'ssh -o BatchMode=yes' works first." >&2
  exit 1
fi
echo "  $ADMIN_USER has $(grep -c . "$AUTH_KEYS") authorized key(s)"

# Ubuntu 24.04 ships /etc/ssh/sshd_config.d/*.conf with a higher precedence
# than sshd_config itself (first match wins, and the Include is at the top), so
# writing a drop-in is both simpler and more reliable than sed-ing the main
# file — where a cloud-init-supplied override would silently win anyway.
cat > /etc/ssh/sshd_config.d/99-remassist-hardening.conf <<'CONF'
# Rem Assist — deploy/harden-ssh.sh
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
CONF
chmod 644 /etc/ssh/sshd_config.d/99-remassist-hardening.conf

sshd -t
systemctl reload ssh

echo
echo "Password authentication is off. Effective settings:"
sshd -T | grep -E '^(passwordauthentication|permitrootlogin|pubkeyauthentication|kbdinteractiveauthentication) ' | sed 's/^/  /'
echo
echo "Do NOT close your current session until a fresh 'ssh remvps true' succeeds."
