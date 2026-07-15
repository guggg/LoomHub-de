#!/usr/bin/env bash
#
# install.sh — Loom onboarding/bootstrap, MECHANICAL part only (Spec §9.0).
#
# Scope (by design — see docs/03-spec.md §9.0 and README's AI-facing install
# section): this script ONLY does the deterministic, non-interactive work:
#   1. git clone the LoomHub-de repo to <target-path> (or `git pull` if it's
#      already there) — idempotent, safe to re-run.
#   2. Delegate to the EXISTING `node scripts/install-skill.mjs loom` to
#      install the Loom skill into the user's agent skill dirs. (If the repo's
#      own node_modules aren't present yet — e.g. a fresh clone — this runs
#      `npm install` first; the only network dependency beyond the git clone.)
#
# It does NOT ask interactive questions, does NOT touch any global user
# config file (~/.claude/CLAUDE.md, ~/.codex/AGENTS.md, ~/.gemini/GEMINI.md),
# and does NOT do onboarding — those are the calling AGENT's job, guided by
# README.md's "AI-facing install instructions" section.
#
# Usage:
#   ./install.sh [target-path]
#
#   target-path   Where to clone (or find an existing clone of) LoomHub-de.
#                 Defaults to ~/LoomHub-de if omitted. The agent driving this
#                 script is expected to ASK THE USER for this path first —
#                 this default is only install.sh's own internal fallback for
#                 direct/manual invocation, not the design's canonical default.
#
# Exit codes: non-zero on any failure (clone/pull failure, or
# install-skill.mjs's own exit code is propagated as-is).

set -euo pipefail

DEFAULT_TARGET="$HOME/LoomHub-de"
FALLBACK_REPO_URL="https://github.com/guggg/LoomHub-de.git"

usage() {
  cat <<'EOF'
Usage: ./install.sh [target-path]

Clones (or updates) the LoomHub-de repo and installs the Loom skill.

  target-path   Where to clone/find LoomHub-de. Defaults to ~/LoomHub-de.
                (The calling agent should ask the user for this path and
                pass it explicitly — see README.md's AI-facing install
                instructions. This script itself never asks.)

  -h, --help    Show this help text.

Behavior:
  - If target-path does not exist: git clone the repo there.
  - If target-path exists and is a git repo: git pull to update it.
  - If target-path is the current directory and already looks like a
    LoomHub-de checkout: skip clone/pull, just install-skill.mjs.
  - Then: cd into target-path and run `node scripts/install-skill.mjs loom`,
    propagating its exit code.

This script does not touch any global agent config file and asks no
interactive questions — that responsibility belongs to the agent following
README.md.
EOF
}

err() {
  echo "[install.sh] error: $*" >&2
}

info() {
  echo "[install.sh] $*" >&2
}

# --- arg parsing -------------------------------------------------------
TARGET_ARG=""
for arg in "$@"; do
  case "$arg" in
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      err "unknown flag: $arg"
      usage
      exit 1
      ;;
    *)
      if [ -n "$TARGET_ARG" ]; then
        err "unexpected extra argument: $arg"
        usage
        exit 1
      fi
      TARGET_ARG="$arg"
      ;;
  esac
done

TARGET="${TARGET_ARG:-$DEFAULT_TARGET}"

# --- helper: is a given directory a LoomHub-de checkout root? ----------
looks_like_loomhub_root() {
  local dir="$1"
  [ -f "$dir/scripts/install-skill.mjs" ] && [ -d "$dir/skills/loom" ]
}

# --- helper: figure out the repo URL to clone from ----------------------
# Tries (in order): the repo the script itself lives in, $PWD if it's a
# checkout, then a hardcoded fallback (needed when install.sh has been
# fetched standalone, e.g. via curl, before any local clone exists).
resolve_repo_url() {
  local script_dir
  # ${BASH_SOURCE[0]:-$0} tolerates `set -u`: BASH_SOURCE is unset when the
  # script is piped directly into bash (e.g. `curl <url> | bash -s -- <path>`,
  # a supported invocation per the README's AI-facing install instructions) —
  # without the fallback this throws "unbound variable" under set -u.
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

  if [ -d "$script_dir/.git" ] && looks_like_loomhub_root "$script_dir"; then
    if git -C "$script_dir" remote get-url origin >/dev/null 2>&1; then
      git -C "$script_dir" remote get-url origin
      return 0
    fi
  fi

  if [ -d "$PWD/.git" ] && looks_like_loomhub_root "$PWD"; then
    if git -C "$PWD" remote get-url origin >/dev/null 2>&1; then
      git -C "$PWD" remote get-url origin
      return 0
    fi
  fi

  echo "$FALLBACK_REPO_URL"
}

# --- main -----------------------------------------------------------------

if [ -z "$TARGET_ARG" ] && looks_like_loomhub_root "$PWD"; then
  # No explicit target given, and we're already sitting inside a LoomHub-de
  # checkout — use it in place rather than cloning a second copy to ~/LoomHub-de.
  info "no target given and \$PWD already looks like a LoomHub-de checkout; using it in place: $PWD"
  TARGET="$PWD"
fi

if [ -e "$TARGET" ]; then
  if [ "$(cd "$TARGET" && pwd)" = "$PWD" ] && looks_like_loomhub_root "$PWD"; then
    info "target is the current directory ($TARGET), already a LoomHub-de checkout — skipping clone/pull"
  elif [ -d "$TARGET/.git" ]; then
    info "target exists and is a git repo — running git pull: $TARGET"
    if ! git -C "$TARGET" pull; then
      err "git pull failed in $TARGET"
      exit 1
    fi
  else
    err "target path exists but is not a git repository: $TARGET"
    err "refusing to overwrite a non-git directory — please remove it or choose another path"
    exit 1
  fi
else
  REPO_URL="$(resolve_repo_url)"
  info "target does not exist — cloning $REPO_URL to $TARGET"
  if ! git clone "$REPO_URL" "$TARGET"; then
    err "git clone failed: $REPO_URL -> $TARGET"
    exit 1
  fi
fi

if ! looks_like_loomhub_root "$TARGET"; then
  err "$TARGET does not look like a LoomHub-de checkout (missing scripts/install-skill.mjs or skills/loom/) — aborting"
  exit 1
fi

# install-skill.mjs depends on the "yaml" package. A fresh clone has no
# node_modules/ (not checked into git), so make sure deps are present before
# delegating — still mechanical/non-interactive, no questions asked.
if [ ! -d "$TARGET/node_modules/yaml" ]; then
  info "dependencies missing — running npm install in $TARGET"
  if ! (cd "$TARGET" && npm install --no-audit --no-fund); then
    err "npm install failed in $TARGET"
    exit 1
  fi
fi

info "installing Loom skill via scripts/install-skill.mjs (from $TARGET)"
set +e
(cd "$TARGET" && node scripts/install-skill.mjs loom)
status=$?
set -e
if [ "$status" -ne 0 ]; then
  err "scripts/install-skill.mjs loom failed (exit $status)"
  exit "$status"
fi

info "done. Loom is installed. Repo is at: $TARGET"
