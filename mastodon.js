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
}

