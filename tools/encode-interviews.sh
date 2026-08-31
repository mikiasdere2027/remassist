#!/usr/bin/env bash
#
# encode-interviews.sh — re-encode the interview clips for the web.
#
# WHY
#   public/uploads/Interviews is 141 MB across five clips, and they are not
#   encoded consistently: ermias-lemma.mp4 is 67 MB on its own, and two of the
#   five run at roughly three times the bitrate of the others for the same
#   framing — a talking head, shot static. At 720p / CRF 23 the set comes out
#   around 20 MB with no visible difference at the size the rail plays them.
#
#   natty-negash.mp4 also carries its moov atom somewhere other than the front
#   of the file, so a browser cannot start playing it until enough of it has
#   arrived to find the index. `-movflags +faststart` moves it to the front for
#   every output here, whether or not the input needed it.
#
# THESE FILES ARE GIT LFS OBJECTS
#   .gitattributes routes *.mp4 through LFS. Re-encoding therefore writes NEW
#   LFS objects; the originals stay in the repository's history and keep
#   occupying space on the remote until someone prunes them deliberately. That
#   is a decision to take on purpose, not a side effect of running this script
#   — nothing here rewrites history.
#
# USAGE
#   tools/encode-interviews.sh              # encode to .encoded/, change nothing
#   tools/encode-interviews.sh --apply      # encode, then replace the originals
#
#   The default is a dry run in the sense that matters: it produces the new
#   files next to the old ones and prints the comparison, so the trade can be
#   judged by watching them rather than by trusting a number here.
#
# REQUIRES
#   ffmpeg (with libx264 and libfdk_aac or the built-in aac encoder). Not
#   installed on the Windows dev box this was written on:
#     winget install Gyan.FFmpeg          # Windows
#     sudo apt install ffmpeg             # Debian / Ubuntu
#     brew install ffmpeg                 # macOS
#
set -euo pipefail

SRC_DIR="public/uploads/Interviews"
OUT_DIR="$SRC_DIR/.encoded"

# 720p is the ceiling, not the target: -2 keeps the height even (libx264
# requires it) and min() means a clip that is already smaller is never
# upscaled, which would add bytes and no detail.
SCALE="scale='min(1280,iw)':-2"

# CRF 23 is x264's default and the right place to start for a static talking
# head. `slow` spends more encoder time for a smaller file at the same quality
# — these are encoded once and served forever, so that trade is free.
CRF=23
PRESET=slow

APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found on PATH — see the REQUIRES note at the top of this file." >&2
  exit 1
fi

if [ ! -d "$SRC_DIR" ]; then
  echo "no $SRC_DIR — run this from the repository root." >&2
  exit 1
fi

# An LFS pointer is a ~130-byte text file. Encoding one produces nothing useful
# and the error ffmpeg gives for it is unhelpful, so say what actually happened.
for f in "$SRC_DIR"/*.mp4; do
  [ -e "$f" ] || continue
  if [ "$(wc -c <"$f")" -lt 1024 ]; then
    echo "$f is a Git LFS pointer, not a video — run 'git lfs pull' first." >&2
    exit 1
  fi
done

mkdir -p "$OUT_DIR"

human() { awk -v b="$1" 'BEGIN{printf "%.1f MB", b/1048576}'; }

total_before=0
total_after=0

for src in "$SRC_DIR"/*.mp4; do
  [ -e "$src" ] || continue
  name=$(basename "$src")
  out="$OUT_DIR/$name"

  echo "==> $name"
  ffmpeg -nostdin -y -loglevel error -stats \
    -i "$src" \
    -vf "$SCALE" \
    -c:v libx264 -crf "$CRF" -preset "$PRESET" -profile:v high -level 4.0 \
    -pix_fmt yuv420p \
    -c:a aac -b:a 128k -ac 2 \
    -movflags +faststart \
    "$out"

  before=$(wc -c <"$src")
  after=$(wc -c <"$out")
  total_before=$((total_before + before))
  total_after=$((total_after + after))
  printf '    %s -> %s  (%d%% of original)\n' \
    "$(human "$before")" "$(human "$after")" "$((after * 100 / before))"
done

echo
printf 'total: %s -> %s\n' "$(human "$total_before")" "$(human "$total_after")"

if [ "$APPLY" -eq 1 ]; then
  echo
  echo "Replacing originals…"
  for out in "$OUT_DIR"/*.mp4; do
    [ -e "$out" ] || continue
    name=$(basename "$out")
    # Only ever replace with something smaller. A clip that grew means the
    # source was already better encoded than these settings produce, and
    # overwriting it would be a regression dressed up as an optimisation.
    if [ "$(wc -c <"$out")" -lt "$(wc -c <"$SRC_DIR/$name")" ]; then
      mv -f "$out" "$SRC_DIR/$name"
      echo "  replaced $name"
    else
      echo "  kept original $name (re-encode was not smaller)"
      rm -f "$out"
    fi
  done
  rmdir "$OUT_DIR" 2>/dev/null || true
  echo
  echo "Done. Next:"
  echo "  1. Watch them: the rail is poster-first, so play each one from a service page."
  echo "  2. git add public/uploads/Interviews && git status   # confirm LFS picked them up"
  echo "  3. New LFS objects are written; the originals remain in history until pruned."
else
  echo
  echo "Wrote $OUT_DIR — nothing replaced. Compare, then re-run with --apply."
fi
