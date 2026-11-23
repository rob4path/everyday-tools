# WhatsApp Transcriere

Un buton **„Transcrie”** sub fiecare mesaj vocal din WhatsApp Web (în Chrome). Textul apare sub mesaj, cu buton „Copiază”.

- **Gratuit**, fără cont, fără abonament.
- **Totul rămâne pe Mac**: transcrierea se face local cu [whisper.cpp](https://github.com/ggml-org/whisper.cpp), nimic nu pleacă pe internet. Textele transcrise sunt ținute doar în browserul tău.
- Merge pe orice Mac (Apple Silicon sau Intel), cu Chrome, Brave, Edge sau Arc.
- Durata transcrierii depinde de lungimea mesajului și de Mac.

## Instalare (≈10 minute)

**Ai nevoie de:** macOS, [Homebrew](https://brew.sh) instalat, ~1,5 GB spațiu liber.

1. Deschide Terminal în rădăcina repository-ului `everyday-tools` și intră în proiect cu `cd projects/whatsapp-transcriere`.
2. Rulează `bash install.sh`. Scriptul instalează ffmpeg și whisper-cpp, descarcă și verifică modelul (~550 MB), apoi transcrie o înregistrare de probă.
3. În Chrome deschide `chrome://extensions`, pornește **Developer mode** (dreapta sus), apasă **Load unpacked** și alege folderul
   `~/Library/Application Support/whatsapp-transcriber/extension`
   (în fereastra de alegere: Cmd+Shift+G, lipește calea, Enter).
4. Reîncarcă WhatsApp Web (Cmd+R). Sub mesajele vocale apare „Transcrie”.

## Verificare pas cu pas

1. După instalare, Terminalul afișează transcrierea înregistrării de probă și mesajul **Test OK.** Pentru a repeta testul din folderul proiectului, rulează `/usr/bin/python3 tests/smoke.py`. Înregistrarea spune „Bună dimineața. Astăzi mergem la piață să cumpărăm mere și portocale.”
2. În Chrome, deschide WhatsApp Web și intră într-o conversație cu un mesaj vocal scurt, în română. Dacă mesajul rulează, pune-l pe pauză.
3. Apasă **Transcrie**. Așteaptă să apară textul sub mesaj și verifică dacă reproduce cuvintele din înregistrare.
4. Apasă **Copiază**, lipește în Notes și compară textul. Reîncarcă pagina cu **⌘R** și revino la același mesaj. Transcrierea ar trebui să fie deja vizibilă.

## Folosire

- Apasă **Transcrie** sub mesajul vocal. Mesajul nu se aude; după câteva secunde apare textul.
- Dacă mesajul tocmai rulează, oprește-l întâi.
- Mesajele transcrise rămân salvate — data viitoare apar direct.
- Limba e română. Pentru altă limbă, schimbă `lang: 'ro'` în `extension/background.js` (ex. `'en'`, sau `'auto'` pentru detectare) în copia din folderul proiectului, rulează din nou `bash install.sh` și apasă ↻ la extensie în `chrome://extensions`.

## Probleme

| Ce vezi | Ce faci |
|---|---|
| Nu apare butonul „Transcrie” | Reîncarcă WhatsApp Web. Verifică în `chrome://extensions` că extensia e pornită. WhatsApp își mai schimbă pagina — atunci trebuie ajustat `content.js`. |
| „Error when communicating with the native messaging host” | Rulează din nou `install.sh`. Nu muta folderul din `~/Library/Application Support/whatsapp-transcriber`. |
| „Specified native messaging host not found” | Browserul nu era găsit la instalare. Deschide-l o dată, apoi rulează din nou `install.sh`. |
| „Nu am prins înregistrarea” | Oprește mesajul dacă rulează și apasă din nou. Dacă mesajul nu era descărcat, mai încearcă o dată după ce se încarcă. |

## Dezinstalare

Rulează `bash uninstall.sh`, apoi scoate extensia din `chrome://extensions`.

## Cum funcționează (pe scurt)

- `extension/main.js` rulează în pagina WhatsApp. Când apeși „Transcrie”, apasă el play pe mesaj, prinde fișierul audio (WhatsApp îl pune într-un `<audio>` cu `blob:`), îl oprește imediat, cu sunet oprit.
- `extension/content.js` adaugă butoanele, afișează textul, ține minte transcrierile (`chrome.storage.local`).
- `extension/background.js` trimite audio-ul, prin *native messaging*, programului local.
- `host/whisper_host.py` (copiat de install.sh în `~/Library/Application Support/whatsapp-transcriber/`) convertește cu ffmpeg și transcrie cu `whisper-cli` + modelul `ggml-large-v3-turbo-q5_0.bin` din `~/.cache/whisper-cpp/`.
- Extensia are ID fix (`cbddlmjjdeadpolfdgehgpdglnpkehpo`, din cheia publică din `manifest.json`), ca înregistrarea native messaging să o recunoască.
