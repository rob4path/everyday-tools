// WhatsApp can play a detached audio element. Arm the hook synchronously,
// before the content script clicks the selected message's play control.
(() => {
  let pending;
  const originalPlay = HTMLMediaElement.prototype.play;

  window.addEventListener('wt-arm', (event) => {
    if (typeof event.detail === 'string') pending = event.detail;
  });
  window.addEventListener('wt-disarm', (event) => {
    if (event.detail === pending) pending = undefined;
  });

  HTMLMediaElement.prototype.play = function (...args) {
    const src = this.currentSrc || this.src;
    if (!pending || !(this instanceof HTMLAudioElement) || !src.startsWith('blob:')) {
      return originalPlay.apply(this, args);
    }

    const reqId = pending;
    pending = undefined;
    // Obtain the blob before WhatsApp can revoke the URL on pause.
    fetch(src).then(async (response) => {
      if (!response.ok) throw new Error('Înregistrarea nu mai este disponibilă.');
      const blob = await response.blob();
      if (blob.size > 47 * 1024 * 1024) throw new Error('Mesajul vocal este prea mare.');
      const audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      window.postMessage({ wt: 'audio', reqId, audio }, location.origin);
    }).catch((error) => window.postMessage({ wt: 'error', reqId, error: error.message }, location.origin));

    const muted = this.muted;
    const position = this.currentTime;
    this.muted = true;
    const playing = originalPlay.apply(this, args);
    const stop = () => {
      try {
        this.pause();
        this.currentTime = position;
      } finally {
        this.muted = muted;
      }
    };
    Promise.resolve(playing).then(stop, stop);
    return playing;
  };
})();
