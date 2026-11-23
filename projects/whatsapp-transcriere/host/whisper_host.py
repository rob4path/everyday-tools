#!/usr/bin/python3
"""Chrome native messaging host: base64 audio in, transcript out.

Runs ffmpeg + whisper-cli locally; nothing leaves this Mac.
Works on Apple Silicon (/opt/homebrew) and Intel (/usr/local) Macs.
"""
import base64
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile

SEARCH = ['/opt/homebrew/bin', '/usr/local/bin']
MODEL = os.path.expanduser('~/.cache/whisper-cpp/ggml-large-v3-turbo-q5_0.bin')


def find(name):
    for d in SEARCH:
        p = os.path.join(d, name)
        if os.access(p, os.X_OK):
            return p
    p = shutil.which(name)
    if p:
        return p
    raise RuntimeError(name + ' nu este instalat (rulează install.sh)')


def read_message():
    raw = sys.stdin.buffer.read(4)
    if not raw:
        return None
    if len(raw) != 4:
        raise ValueError('Antet incomplet.')
    (length,) = struct.unpack('<I', raw)
    if not 0 < length <= 64 * 1024 * 1024:
        raise ValueError('Dimensiune mesaj nevalidă.')
    payload = sys.stdin.buffer.read(length)
    if len(payload) != length:
        raise ValueError('Mesaj incomplet.')
    return json.loads(payload)


def send(obj):
    data = json.dumps(obj, ensure_ascii=False).encode('utf-8')
    if len(data) > 1024 * 1024:
        data = b'{"error":"Transcrierea este prea lunga."}'
    sys.stdout.buffer.write(struct.pack('<I', len(data)))
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


def transcribe(audio_b64, lang):
    if not os.path.exists(MODEL):
        raise RuntimeError('modelul whisper lipsește (rulează install.sh)')
    ffmpeg, whisper = find('ffmpeg'), find('whisper-cli')
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, 'in.ogg')
        wav = os.path.join(tmp, 'in.wav')
        output = os.path.join(tmp, 'transcript')
        with open(src, 'wb') as f:
            f.write(base64.b64decode(audio_b64, validate=True))
        subprocess.run(
            [ffmpeg, '-nostdin', '-loglevel', 'error', '-protocol_whitelist', 'file',
             '-format_whitelist', 'ogg,matroska,webm,mov,mp3,wav,aac,flac', '-i', src,
             '-map', '0:a:0', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav],
            check=True, capture_output=True,
        )
        subprocess.run(
            [whisper, '-m', MODEL, '-l', lang, '-nt', '-otxt', '-of', output, '-f', wav],
            check=True, capture_output=True, text=True,
        )
        with open(output + '.txt', encoding='utf-8') as transcript:
            text = ' '.join(line.strip() for line in transcript if line.strip())
        if not text:
            raise ValueError('Nu s-a detectat vorbire.')
        return text


def main():
    try:
        msg = read_message()
        if msg is None:
            return
        send({'text': transcribe(msg['audio'], msg.get('lang', 'ro'))})
    except subprocess.CalledProcessError as e:
        err = e.stderr.decode(errors='replace') if isinstance(e.stderr, bytes) else (e.stderr or '')
        send({'error': err.strip().splitlines()[-1] if err.strip() else str(e)})
    except Exception as e:  # noqa: BLE001
        send({'error': str(e)})


if __name__ == '__main__':
    main()
