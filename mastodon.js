let config = {};
let pantry = {};
let latch = true;
let timelineInterval = null;
let pantryInterval = null;
let timeline = [];

window.addEventListener('load', (e) => {
  const modal = document.getElementById('startup-modal');
  const col = document.getElementById('timeline');

  fetch('./rummage.json')
    .then((response) => {
      response.arrayBuffer()
        .then(setConfig);
    });

  timelineInterval = setInterval(getTimeline, 200);
  pantryInterval = setInterval(getPantry, 250);
});

function getPantry() {
  if (!Object.prototype.hasOwnProperty.call(config, 'pantry')) {
    return;
  }

  const pantry = httpGet(
    `https://getpantry.cloud/apiv1/pantry/${config.pantry.trim()}`,
    null,
    assignPantry
  );

  clearInterval(pantryInterval);
  pantryInterval = setInterval(updatePantry, 6000);
}

function assignPantry(p) {
  pantry = p;
}

function updatePantry() {
  if (timeline.length === 0) {
    return;
  }

  // Eventually, we'll insert data based on the timeline contents.
}

function getTimeline() {
  if (latch === true) {
    return;
  }

  clearInterval(timelineInterval);
  const tl = httpGet(
    `https://${config.server}/api/v1/timelines/home`,
    `${config.token.token_type} ${config.token.access_token}`,
    assignTimeline
  );
  timelineInterval = setInterval(layoutTimeline, 100);
}

function assignTimeline(t) {
  timeline = t;
}

function layoutTimeline() {
  if (timeline.length === 0) {
    return;
  }

  const tl = document.getElementById('timeline');

  clearInterval(timelineInterval);
  timelineInterval = null;
  timeline.reverse().forEach((t) => {
    if (t.content === '') {
      return;
    }

    const panel = document.createElement('div');
    const status = document.createElement('div');
    const header = document.createElement('div');
    const footer = document.createElement('div');
    const headerText = document.createElement('span');
    const avatar = document.createElement('img');
    const user = document.createElement('span');
    const userLink = document.createElement('a');
    const toot = document.createElement('span');
    const tootLink = document.createElement('a');
    const line = document.createElement('br');
    const warning = document.createElement('summary');
    const warned = document.createElement('details');
    const date = new Date(t.created_at);

    panel.classList.add('toot');
    header.classList.add('header');
    footer.classList.add('footer');
    headerText.classList.add('head');

    if (t.spoiler_text === null || t.spoiler_text.length === 0) {
      status.innerHTML = t.content;
    } else {
      warned.innerHTML = t.content;
      warning.innerHTML = t.spoiler_text;
      warned.appendChild(warning);
      status.appendChild(warned);
    }

    avatar.src = t.account.avatar;
    userLink.href = t.account.url;
    userLink.innerHTML = t.account.display_name;
    tootLink.href = t.url;
    tootLink.innerHTML = date.toString().split(' ').slice(0,4).join(' ');
    header.appendChild(avatar);
    user.appendChild(userLink);
    toot.appendChild(tootLink);
    headerText.appendChild(userLink);
    headerText.appendChild(line);
    headerText.appendChild(tootLink);
    header.appendChild(headerText);
    header.appendChild(toot);
    panel.appendChild(header);
    panel.appendChild(status);
    panel.appendChild(footer);

    t.media_attachments.forEach((m) => {
      if (m.type === 'image') {
        const image = document.createElement('img');

        image.src = m.url;
        image.classList.add('embedded-image');

        if (t.sensitive) {
          image.classList.add('sensitive');
        }

        if (m.description) {
          image.alt = m.description;
          image.title = m.description;
        }

        panel.appendChild(image);
      }

      if (m.type === 'video') {
        const video = document.createElement('video');
        const source = document.createEleemnt('source');

        video.classList = 'embedded-video';
        source.src = m.url;

        if (t.sensitive) {
          image.classList.add('sensitive');
        }

        if (m.description) {
          image.title = m.description;
        }

        video.appendChild(source);
        panel.appendChild(video);
      }
    });

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
function httpGet(url, auth, assigner) {
  const xhr = new XMLHttpRequest();

  xhr.open('GET', url, true);
  if (auth) {
    xhr.setRequestHeader('Authorization', auth);
  }

  xhr.onload = (e) => {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        assigner(JSON.parse(xhr.responseText));
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

function httpPut(url, data) {
  const xhr = new XMLHttpRequest();

  xhr.withCredentials = true;
  xhr.addEventListener("readystatechange", function() {
    if (this.readyState === 4) {
      return this.responseText;
    }
  });

  xhr.open("PUT", url);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(data);
}
