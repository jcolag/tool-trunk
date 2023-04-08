let config = {};
let latch = true;
let timer = null;
let timeline = [];

window.addEventListener('load', (e) => {
  const modal = document.getElementById('startup-modal');
  const col = document.getElementById('timeline');

  fetch('./rummage.json')
    .then((response) => {
      response.arrayBuffer()
        .then(setConfig);
    });

  timer = setInterval(getTimeline, 200);
});

function getTimeline() {
  if (latch === true) {
    return;
  }

  clearInterval(timer);
  const tl = httpGet(`https://${config.server}/api/v1/timelines/public`);
  timer = setInterval(layoutTimeline, 100);
}

function layoutTimeline() {
  if (timeline.length === 0) {
    return;
  }

  const tl = document.getElementById('timeline');

  clearInterval(timer);
  timer = null;
  timeline.forEach((t) => {
    const panel = document.createElement('div');

    panel.classList.add('toot');
    panel.innerHTML = t.content;
    tl.appendChild(panel);
  });
}

function setConfig(response) {
  const modal = document.getElementById('startup-modal');
  const decoder = new TextDecoder('utf-8');
  const json = decoder.decode(response);

  config = JSON.parse(json);
  modal.classList.add('hidden-modal');
  latch = false;
}

// Adapted from https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Synchronous_and_Asynchronous_Requests
function httpGet(url) {
  const xhr = new XMLHttpRequest();

  xhr.open('GET', url, true);
  xhr.onload = (e) => {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        timeline = JSON.parse(xhr.responseText);
      } else {
        console.error(xhr.statusText);
        return null;
      }
    }
  };
  xhr.onerror = (e) => {
    console.error(xhr.statusText);
    return null;
  };
  xhr.send(null);
  latch = false;
}

