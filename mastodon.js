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
});

function setConfig(response) {
  const modal = document.getElementById('startup-modal');
  const decoder = new TextDecoder('utf-8');
  const json = decoder.decode(response);

  config = JSON.parse(json);
  modal.classList.add('hidden-modal');

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

