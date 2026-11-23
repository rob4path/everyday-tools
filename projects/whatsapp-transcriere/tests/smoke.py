#!/usr/bin/python3
"""Send the bundled Romanian voice note through the installed native host."""
import base64
import json
from pathlib import Path
import re
import struct
import subprocess
import unicodedata

HOST = Path.home() / 'Library/Application Support/whatsapp-transcriber/whisper_host.py'
CLIP = Path(__file__).with_name('romanian.ogg')


def main():
    if not HOST.is_file():
        raise SystemExit('Host-ul lipsește. Rulează bash install.sh.')
    data = json.dumps({'audio': base64.b64encode(CLIP.read_bytes()).decode(), 'lang': 'ro'}).encode()
    result = subprocess.run([str(HOST)], input=struct.pack('<I', len(data)) + data,
                            capture_output=True, timeout=300, check=True)
    frame = result.stdout
    if len(frame) < 4 or struct.unpack('<I', frame[:4])[0] != len(frame) - 4:
        raise SystemExit('Răspuns native messaging incomplet.')
    reply = json.loads(frame[4:])
    if 'error' in reply:
        raise SystemExit(reply['error'])
    text = reply['text']
    print(text)
    normalized = unicodedata.normalize('NFKD', text.casefold()).encode('ascii', 'ignore').decode()
    keywords = {'dimineata', 'mergem', 'piata', 'mere', 'portocale'}
    if len(keywords.intersection(re.findall(r'[a-z]+', normalized))) < 3:
        raise SystemExit('Transcrierea nu conține suficiente cuvinte din înregistrarea de test.')
    print('Test OK.')


if __name__ == '__main__':
    main()
