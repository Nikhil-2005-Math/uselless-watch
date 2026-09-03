(() => {
  'use strict';

  const STORAGE_KEY = 'analog-clock-reader-history';
  const steps = [
    '[1/3] Detecting bezel geometry & radial pivot...',
    '[2/3] Computing trigonometric vector offsets...',
    '[3/3] Synthesizing high-precision digital output...'
  ];
  const punchlines = [
    'JUST LOOK AT YOUR WRIST!',
    'USE YOUR EYES, NOT AN AI!',
    'CONGRATS. YOU HAVE A WATCH.',
    'IT IS TIME TO BUY A DIGITAL CLOCK.'
  ];
  const roast = 'Computation complete. You took a high-resolution photo with a smartphone that already tells the time, uploaded it to a computer, and waited four seconds, just to read an analog watch. Please, just look at your wrist.';

  const elements = {
    tabs: document.querySelectorAll('.tab'),
    uploadView: document.querySelector('#upload-view'),
    historyView: document.querySelector('#history-view'),
    dropZone: document.querySelector('#drop-zone'),
    fileInput: document.querySelector('#file-input'),
    dropContent: document.querySelector('#drop-content'),
    previewContent: document.querySelector('#preview-content'),
    imagePreview: document.querySelector('#image-preview'),
    fileName: document.querySelector('#file-name'),
    removeImage: document.querySelector('#remove-image'),
    uploadStatus: document.querySelector('#upload-status'),
    analyzeButton: document.querySelector('#analyze-button'),
    voiceToggle: document.querySelector('#voice-toggle'),
    telemetryToggle: document.querySelector('#telemetry-toggle'),
    overlay: document.querySelector('#reveal-overlay'),
    inspection: document.querySelector('#inspection-stage'),
    scanImage: document.querySelector('#scan-image'),
    scanStatus: document.querySelector('#scan-status'),
    triumph: document.querySelector('#triumph-stage'),
    digitalTime: document.querySelector('#digital-time'),
    roastStage: document.querySelector('#roast-stage'),
    revealTitle: document.querySelector('#reveal-title'),
    roastCopy: document.querySelector('#roast-copy'),
    replayVoice: document.querySelector('#replay-voice'),
    uploadAnother: document.querySelector('#upload-another'),
    historyList: document.querySelector('#history-list'),
    emptyState: document.querySelector('#empty-state'),
    clearHistory: document.querySelector('#clear-history'),
    wastedTotal: document.querySelector('#wasted-total'),
    emptyUpload: document.querySelector('#empty-upload'),
    historyCount: document.querySelector('.history-count'),
    toast: document.querySelector('#toast')
  };

  let selectedImage = null;
  let selectedFileName = '';
  let currentPunchline = '';
  let currentFakeTime = '';
  let analysisTimers = [];
  let toastTimer;

  function getHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory(entry) {
    const history = [entry, ...getHistory()].slice(0, 30);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      showToast('The image was too large to save in browser history.');
    }
    renderHistory();
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 3500);
  }

  function setView(viewName) {
    const isUpload = viewName === 'upload';
    elements.uploadView.hidden = !isUpload;
    elements.historyView.hidden = isUpload;
    elements.uploadView.classList.toggle('is-visible', isUpload);
    elements.historyView.classList.toggle('is-visible', !isUpload);
    elements.tabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.view === viewName));
    history.replaceState(null, '', isUpload ? '#upload' : '#history');
    if (!isUpload) renderHistory();
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const maxDimension = 1200;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d', { alpha: false });
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/jpeg', .82));
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Unable to read this image.'));
      };
      image.src = objectUrl;
    });
  }

  async function handleFile(file) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showToast('Please choose a PNG, JPG, JPEG, or WEBP image.');
      return;
    }
    elements.uploadStatus.textContent = 'Optimizing local image…';
    elements.analyzeButton.disabled = true;
    try {
      selectedImage = await resizeImage(file);
      selectedFileName = file.name;
      elements.imagePreview.src = selectedImage;
      elements.fileName.textContent = selectedFileName;
      elements.dropContent.hidden = true;
      elements.previewContent.hidden = false;
      elements.analyzeButton.disabled = false;
      elements.uploadStatus.textContent = 'Image ready. The clock is trembling.';
    } catch {
      selectedImage = null;
      elements.uploadStatus.textContent = 'That image could not be processed.';
      showToast('Unable to process this image. Try another file.');
    }
  }

  function resetUpload() {
    selectedImage = null;
    selectedFileName = '';
    elements.fileInput.value = '';
    elements.imagePreview.removeAttribute('src');
    elements.dropContent.hidden = false;
    elements.previewContent.hidden = true;
    elements.analyzeButton.disabled = true;
    elements.uploadStatus.textContent = '';
  }

  function speakRoast() {
    if (!elements.voiceToggle.checked || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(roast);
    utterance.rate = .94;
    utterance.pitch = .82;
    const chooseVoice = () => {
      const englishVoice = window.speechSynthesis.getVoices().find((voice) => /^en(-|_)/i.test(voice.lang));
      if (englishVoice) utterance.voice = englishVoice;
      window.speechSynthesis.speak(utterance);
    };
    if (window.speechSynthesis.getVoices().length) chooseVoice();
    else window.speechSynthesis.onvoiceschanged = chooseVoice;
  }

  function getLocalTime() {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  function generateFakeTime(fileName) {
    const match = fileName.match(/(?:^|[^\d])([01]?\d)[-_.:]?([0-5]\d)(?:[-_.:]?([0-5]\d))?/);
    if (match) {
      let hour = Number(match[1]);
      const minute = Number(match[2]);
      const second = Number(match[3] || Math.floor(Math.random() * 60));
      const meridiem = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')} ${meridiem}`;
    }
    return getLocalTime();
  }

  function showStage(stage) {
    [elements.inspection, elements.triumph, elements.roastStage].forEach((node) => { node.hidden = node !== stage; });
  }

  function typePunchline(text) {
    elements.revealTitle.replaceChildren();
    [...text].forEach((character, index) => {
      const span = document.createElement('span');
      span.className = 'pop-in';
      span.textContent = character;
      span.style.animationDelay = `${index * 90}ms`;
      elements.revealTitle.appendChild(span);
    });
    fitPunchline();
  }

  function fitPunchline() {
    elements.revealTitle.style.fontSize = '';
    const availableWidth = elements.revealTitle.clientWidth;
    let fontSize = parseFloat(window.getComputedStyle(elements.revealTitle).fontSize);
    while (elements.revealTitle.scrollWidth > availableWidth && fontSize > 16) {
      fontSize -= 1;
      elements.revealTitle.style.fontSize = `${fontSize}px`;
    }
  }

  function beginAnalysis() {
    if (!selectedImage) return;
    analysisTimers.forEach(clearTimeout);
    currentFakeTime = generateFakeTime(selectedFileName);
    currentPunchline = punchlines[Math.floor(Math.random() * punchlines.length)];
    elements.scanImage.src = selectedImage;
    elements.digitalTime.textContent = currentFakeTime;
    showStage(elements.inspection);
    elements.overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    steps.forEach((step, index) => analysisTimers.push(setTimeout(() => { elements.scanStatus.textContent = step; }, index * 820)));
    analysisTimers.push(setTimeout(() => showStage(elements.triumph), 2500));
    analysisTimers.push(setTimeout(() => {
      showStage(elements.roastStage);
      elements.overlay.classList.add('is-shaking');
      typePunchline(currentPunchline);
      elements.roastCopy.textContent = roast;
      saveHistory({ id: Date.now(), image: selectedImage, fakeTime: currentFakeTime, punchline: currentPunchline, timestamp: new Date().toISOString() });
      setTimeout(() => elements.overlay.classList.remove('is-shaking'), 350);
      setTimeout(speakRoast, Math.max(700, currentPunchline.length * 80));
    }, 2850));
  }

  function renderHistory() {
    const history = getHistory();
    elements.historyList.replaceChildren();
    elements.emptyState.hidden = history.length > 0;
    elements.clearHistory.hidden = history.length === 0;
    elements.historyCount.hidden = history.length === 0;
    elements.historyCount.textContent = history.length;
    elements.wastedTotal.textContent = `${(history.length * 4.12).toFixed(2)}s`;
    history.forEach((entry) => {
      const item = document.createElement('article');
      item.className = 'history-item';
      const date = new Date(entry.timestamp);
      item.innerHTML = `<img class="history-thumb" src="${entry.image}" alt="Saved watch scan"><div><p class="history-result">${entry.fakeTime || 'TIME RECOVERED'}</p><p class="history-time"><strong>${entry.punchline}</strong><br>Effort wasted: 4.12 seconds · ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p></div><button class="delete-button" type="button" aria-label="Delete scan">×</button>`;
      item.querySelector('.delete-button').addEventListener('click', () => {
        const remaining = getHistory().filter((savedEntry) => savedEntry.id !== entry.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
        renderHistory();
      });
      elements.historyList.appendChild(item);
    });
  }

  elements.tabs.forEach((tab) => tab.addEventListener('click', () => setView(tab.dataset.view)));
  elements.dropZone.addEventListener('click', (event) => {
    if (event.target !== elements.removeImage) elements.fileInput.click();
  });
  elements.dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); elements.fileInput.click(); }
  });
  elements.fileInput.addEventListener('change', () => handleFile(elements.fileInput.files[0]));
  ['dragenter', 'dragover'].forEach((eventName) => elements.dropZone.addEventListener(eventName, (event) => { event.preventDefault(); elements.dropZone.classList.add('is-dragging'); }));
  ['dragleave', 'drop'].forEach((eventName) => elements.dropZone.addEventListener(eventName, (event) => { event.preventDefault(); elements.dropZone.classList.remove('is-dragging'); }));
  elements.dropZone.addEventListener('drop', (event) => handleFile(event.dataTransfer.files[0]));
  elements.removeImage.addEventListener('click', (event) => { event.stopPropagation(); resetUpload(); });
  elements.analyzeButton.addEventListener('click', beginAnalysis);
  elements.replayVoice.addEventListener('click', speakRoast);
  elements.uploadAnother.addEventListener('click', () => { window.speechSynthesis?.cancel(); elements.overlay.hidden = true; document.body.style.overflow = ''; resetUpload(); setView('upload'); });
  elements.emptyUpload.addEventListener('click', () => setView('upload'));
  elements.clearHistory.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); renderHistory(); });
  window.addEventListener('resize', () => { if (currentPunchline) fitPunchline(); });
  window.addEventListener('beforeunload', () => window.speechSynthesis?.cancel());

  renderHistory();
  elements.digitalTime.textContent = getLocalTime();
  window.setInterval(() => {
    if (elements.overlay.hidden) elements.digitalTime.textContent = getLocalTime();
  }, 1000);
  if (window.location.hash === '#history') setView('history');
})();
