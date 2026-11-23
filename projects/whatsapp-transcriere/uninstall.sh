#!/bin/bash
# Șterge transcrierea WhatsApp: programul local, extensia copiată, înregistrările
# la browsere și (opțional) modelul. ffmpeg și whisper-cpp rămân în Homebrew.
set -uo pipefail
HOST_NAME="com.whatsapp_transcriber.whisper"
rm -rf "$HOME/Library/Application Support/whatsapp-transcriber"
for base in "Google/Chrome" "Google/Chrome Beta" "Chromium" \
  "BraveSoftware/Brave-Browser" "Microsoft Edge" "Arc/User Data" "Vivaldi"; do
  rm -f "$HOME/Library/Application Support/$base/NativeMessagingHosts/$HOST_NAME.json"
done
read -r -p "Șterg și modelul de vorbire (~550 MB)? [d/N] " a
[[ "$a" =~ ^[dDyY] ]] && rm -f "$HOME/.cache/whisper-cpp/ggml-large-v3-turbo-q5_0.bin"
echo "Gata. Scoate și extensia „WhatsApp Transcriere” din chrome://extensions."
echo "(Dacă vrei, scoate și uneltele: brew uninstall whisper-cpp ffmpeg)"
