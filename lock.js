(() => {
  'use strict';

  const timeElement = document.querySelector('#current-time');
  const dateElement = document.querySelector('#current-date');
  const unlockButton = document.querySelector('#unlock-button');

  function updateClock() {
    const now = new Date();
    timeElement.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    dateElement.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function unlock() {
    unlockButton.classList.add('is-unlocking');
    unlockButton.querySelector('span:nth-child(2)').textContent = 'Opening optical recovery';
    window.setTimeout(() => { window.location.href = 'index.html?unlocked=1'; }, 420);
  }

  unlockButton.addEventListener('click', unlock);
  document.addEventListener('keydown', (event) => { if (event.key === 'Enter') unlock(); });
  updateClock();
  window.setInterval(updateClock, 1000);
})();
