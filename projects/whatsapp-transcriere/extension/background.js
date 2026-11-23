const HOST = 'com.whatsapp_transcriber.whisper';

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (sender.origin !== 'https://web.whatsapp.com' || msg?.type !== 'transcribe') return;
  if (typeof msg.audio !== 'string' || !msg.audio.length || msg.audio.length > 64 * 1024 * 1024 - 1024) {
    reply({ error: 'Înregistrarea este goală sau prea mare.' });
    return;
  }
  chrome.runtime.sendNativeMessage(HOST, { audio: msg.audio, lang: 'ro' }, (res) => {
    if (chrome.runtime.lastError) reply({ error: chrome.runtime.lastError.message });
    else reply(res);
  });
  return true;
});
