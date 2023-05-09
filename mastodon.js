let config = {};
let pantry = {
  toots: [],
};
let latch = true;
let timelineInterval = null;
let pantryInterval = null;
let timeline = [];

window.addEventListener('load', () => {
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

  httpGet(
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
  httpGet(
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
    let toot = t;

    if (pantry.toots.indexOf(toot.id) < 0) {
      pantry.toots.push(toot.id);
    }

    if (t.content === '') {
      if (t.reblog === null) {
        return;
      } else {
        toot = t.reblog;
        if (pantry.toots.indexOf(toot.id) < 0) {
          pantry.toots.push(toot.id);
        }
      }
    }

    const parts = buildToot(toot, t);
    const panel = buildTootPanel(toot, parts[0], parts[2], parts[1]);

    tl.appendChild(panel);
  });
}

function buildToot(toot, original) {
  const status = buildStatus(toot);
  const footer = buildFooter(toot);
  const avatar = buildAvatar(toot, original);
  const header = buildHeader(toot, avatar);
  return [header, status, footer];
}

function buildTootPanel(toot, header, footer, status) {
  const panel = document.createElement('div');

  panel.classList.add('toot');
  panel.appendChild(header);
  panel.appendChild(status);
  panel.appendChild(footer);

  toot.media_attachments.forEach((m) => {
    switch (m.type) {
    case 'image': {
      const image = buildImage(m, toot);

      image.classList.add(`media-${toot.media_attachments.length}`);
      panel.appendChild(image);
      break;
    }
    case 'video': {
      const video = buildVideo(m, toot);

      video.classList.add(`media-${toot.media_attachments.length}`);
      panel.appendChild(video);
    }
    }
  });

  return panel;
}

function buildHeader(toot, avatar) {
  const date = new Date(toot.created_at);
  const header = document.createElement('div');
  const headerText = document.createElement('span');
  const line = document.createElement('br');
  const tootLabel = document.createElement('span');
  const tootLink = document.createElement('a');
  const user = document.createElement('span');
  const userLink = document.createElement('a');

  header.classList.add('header');
  headerText.classList.add('head');
  userLink.href = toot.account.url;
  userLink.innerHTML = toot.account.display_name;
  tootLink.href = toot.url;
  tootLink.innerHTML = date.toString().split(' ').slice(0,4).join(' ');
  header.appendChild(avatar);
  user.appendChild(userLink);
  tootLabel.appendChild(tootLink);
  headerText.appendChild(userLink);
  headerText.appendChild(line);
  headerText.appendChild(tootLink);
  header.appendChild(headerText);
  header.appendChild(tootLabel);
  return header;
}

function buildAvatar(toot, originalToot) {
  const avatar = document.createElement('img');
  const link = document.createElement('a');
  let complete;

  avatar.src = toot.account.avatar;
  avatar.title = `${toot.account.display_name} (@${toot.account.username})`;
  link.href = toot.account.url;
  link.appendChild(avatar);

  if (toot === originalToot) {
    complete = link;
  } else {
    const container = document.createElement('span');
    const origAvatar = buildAvatar(originalToot, originalToot);

    container.appendChild(origAvatar);
    container.appendChild(link);
    complete = container;
  }

  return complete;
}

function buildStatus(toot) {
  const status = document.createElement('div');
  const warned = document.createElement('details');
  const warning = document.createElement('summary');

  if (toot.spoiler_text === null || toot.spoiler_text.length === 0) {
    status.innerHTML = toot.content;
  } else {
    warned.innerHTML = toot.content;
    warning.innerHTML = toot.spoiler_text;
    warned.appendChild(warning);
    status.appendChild(warned);
  }

  return status;
}

function buildImage(media, toot) {
  const image = document.createElement('img');

  image.src = media.url;
  image.classList.add('embedded-image');

  if (toot.sensitive) {
    image.classList.add('sensitive');
  }

  if (media.description) {
    image.alt = media.description;
    image.title = media.description;
  }

  return image;
}

function buildVideo(media, toot) {
  const source = document.createElement('source');
  const video = document.createElement('video');

  source.src = media.url;
  video.classList = 'embedded-video';

  if (toot.sensitive) {
    video.classList.add('sensitive');
  }

  if (media.description) {
    video.alt = media.description;
    video.title = media.description;
  }

  video.appendChild(source);
  return video;
}

function buildFooter() {
  const emoji = [ '💬', '🔁', '❤️', '🔖', '…' ];
  const footer = document.createElement('div');

  emoji.forEach((e) => {
    const button = document.createElement('button');
    const text = document.createTextNode(e);

    button.appendChild(text);
    footer.appendChild(button);
  });
  footer.classList.add('footer');
  return footer;
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

  xhr.onload = () => {
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
    console.log(e);
    console.error(xhr.statusText);
    return null;
  };
  xhr.send(null);
  latch = false;
}

function httpPut(url, data) {
  const xhr = new XMLHttpRequest();

  xhr.withCredentials = true;
  xhr.addEventListener('readystatechange', function() {
    if (this.readyState === 4) {
      return this.responseText;
    }
  });

  xhr.open('PUT', url);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(data);
}
