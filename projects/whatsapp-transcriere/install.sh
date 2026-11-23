#!/bin/bash
# Instalează transcrierea mesajelor vocale din WhatsApp Web (macOS).
# Pune: ffmpeg + whisper-cpp (Homebrew), modelul de vorbire (~550 MB),
# programul local în ~/Library/Application Support/whatsapp-transcriber
# și îl înregistrează la Chrome / Brave / Edge / Arc / Chromium.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
HOST_NAME="com.whatsapp_transcriber.whisper"
EXT_ID="cbddlmjjdeadpolfdgehgpdglnpkehpo"
APP_DIR="$HOME/Library/Application Support/whatsapp-transcriber"
EXT_DIR="$APP_DIR/extension"
MODEL_DIR="$HOME/.cache/whisper-cpp"
MODEL="$MODEL_DIR/ggml-large-v3-turbo-q5_0.bin"
MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin"
MODEL_SHA256=394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

[ "$(uname)" = "Darwin" ] || { echo "Doar pentru macOS."; exit 1; }

# 1. Homebrew
if ! command -v brew >/dev/null 2>&1; then
  for b in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    [ -x "$b" ] && eval "$("$b" shellenv)"
  done
fi
if ! command -v brew >/dev/null 2>&1; then
  say "Lipsește Homebrew. Instalează-l de pe https://brew.sh, apoi rulează din nou acest script."
  exit 1
fi

# 2. ffmpeg + whisper-cpp
say "1/4 Instalez ffmpeg și whisper-cpp (poate dura câteva minute)…"
command -v ffmpeg >/dev/null || brew install ffmpeg
command -v whisper-cli >/dev/null || brew install whisper-cpp

/usr/bin/python3 --version >/dev/null 2>&1 || {
  say "Lipsește python3 de sistem. Rulează: xcode-select --install, apoi din nou acest script."
  exit 1
}

# 3. Model (~550 MB), reia descărcarea dacă se întrerupe
say "2/4 Descarc modelul de vorbire (~550 MB)…"
mkdir -p "$MODEL_DIR"
valid_model() {
  [ -f "$1" ] && [ "$(shasum -a 256 "$1" | cut -d ' ' -f 1)" = "$MODEL_SHA256" ]
}
if ! valid_model "$MODEL"; then
  part="$MODEL.part"
  if ! valid_model "$part"; then
    curl -fL -C - --retry 3 --connect-timeout 20 --speed-limit 1000 --speed-time 60 -o "$part" "$MODEL_URL" || {
      echo "Descărcarea nu s-a terminat. Rulează din nou install.sh pentru a continua."
      exit 1
    }
  fi
  if ! valid_model "$part"; then
    rm -f "$part"
    echo "Modelul descărcat nu a trecut verificarea SHA-256. Rulează din nou install.sh."
    exit 1
  fi
  mv -f "$part" "$MODEL"
fi
echo "Model OK."

# 4. Programul local + extensia, în afara Documents/Desktop/Downloads
#    (macOS nu lasă Chrome să pornească programe din acele foldere).
say "3/4 Copiez programul și extensia…"
mkdir -p "$APP_DIR"
cp "$HERE/host/whisper_host.py" "$APP_DIR/whisper_host.py"
chmod +x "$APP_DIR/whisper_host.py"
mkdir -p "$EXT_DIR"
cp "$HERE"/extension/* "$EXT_DIR/"

# 5. Înregistrare la browsere (cele instalate)
say "4/4 Înregistrez programul la browser…"
MANIFEST=$(cat <<EOF
{
  "name": "$HOST_NAME",
  "description": "Transcriere locală (whisper) pentru WhatsApp Web",
  "path": "$APP_DIR/whisper_host.py",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXT_ID/"]
}
EOF
)
registered=0
for base in \
  "Google/Chrome" "Google/Chrome Beta" "Chromium" \
  "BraveSoftware/Brave-Browser" "Microsoft Edge" "Arc/User Data" "Vivaldi"; do
  dir="$HOME/Library/Application Support/$base"
  if [ -d "$dir" ]; then
    mkdir -p "$dir/NativeMessagingHosts"
    printf '%s\n' "$MANIFEST" > "$dir/NativeMessagingHosts/$HOST_NAME.json"
    echo "  ✓ $base"
    registered=1
  fi
done
if [ "$registered" -eq 0 ]; then
  echo "Deschide Chrome/Brave/Edge/Arc o dată și rulează din nou install.sh."
  exit 1
fi

say "Testez o înregistrare în limba română…"
/usr/bin/python3 "$HERE/tests/smoke.py"

say "Gata. Mai rămâne un pas, în browser:"
cat <<EOF
  1. Deschide  chrome://extensions  (în Brave: brave://extensions, în Edge: edge://extensions)
  2. Pornește „Developer mode” / „Modul dezvoltator” (dreapta sus)
  3. Apasă „Load unpacked” și alege folderul:
       $EXT_DIR
     (în fereastra de alegere apasă Cmd+Shift+G și lipește calea de mai sus)
  4. Reîncarcă pagina WhatsApp Web (Cmd+R)

Sub fiecare mesaj vocal apare butonul „Transcrie”.
EOF
