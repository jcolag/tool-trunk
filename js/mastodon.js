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
    `https://getpantry.cloud/apiv1/pantry/${config.pantry.trim()}`
      + '/basket/Rummager',
    null,
    assignPantry
  );

  clearInterval(pantryInterval);
  pantryInterval = setInterval(updatePantry, 500);
}

function assignPantry(p) {
  pantry = p;
  if (!Object.prototype.hasOwnProperty.call(pantry, 'toots')) {
    pantry.toots = [];
  }
}

function updatePantry() {
  if (timeline.length === 0) {
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(config, 'pantry')) {
    return;
  }

  let ids = timeline.map((t) => t.id);
  const rids = timeline
    .map((t) => t.reblog)
    .filter((t) => t)
    .map((t) => t.id);

  for (let i = 0; i < rids.length; i++) {
    ids.push(rids[i]);
  }

  for (let i = 0; i < pantry.toots; i++) {
    ids.push(pantry.toots[i]);
  }

  pantry.toots = ids.filter((v, i, a) => a.indexOf(v) === i)
  clearInterval(pantryInterval);
  pantryInterval = null;
  httpPut(
    `https://getpantry.cloud/apiv1/pantry/${config.pantry.trim()}`
      + '/basket/Rummager',
    pantry
  );
}

function getTimeline() {
  if (latch === true) {
    return;
  }

  clearInterval(timelineInterval);
  httpGet(
    `https://${config.server}/api/v1/timelines/home?limit=40`,
    `${config.token.token_type} ${config.token.access_token}`,
    assignTimeline
  );
  timelineInterval = setInterval(layoutTimeline, 100);
}

function assignTimeline(t) {
  timeline = t;
}

function layoutTimeline() {
  if (timeline.length === 0 || pantry.toots.length === 0) {
    return;
  }

  const tl = document.getElementById('timeline');

  clearInterval(timelineInterval);
  timelineInterval = null;
  timeline
    .filter((t) => pantry.toots.indexOf(t.id) < 0)
    .filter((t) =>
      !Object.prototype.hasOwnProperty.call(t, 'reblog')
      || t.reblog === null
      || pantry.toots.indexOf(t.reblog.id) < 0
    )
    .reverse().forEach((t) => {
      let toot = t;
  console.log(toot);
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

  if (toot.media_attachments.length > 0) {
    const warned = document.createElement('details');
    const warning = document.createElement('summary');
    const container = document.createElement('div');

    warning.appendChild(
      document.createTextNode(
        `See ${toot.media_attachments.length} media elements:`
      )
    );
    warned.appendChild(warning);
    warned.appendChild(container);
    toot.media_attachments.forEach((m) => {
      switch (m.type) {
      case 'image': {
        const image = buildImage(m, toot);

        image.classList.add(`media-${toot.media_attachments.length}`);
        container.appendChild(image);
        break;
      }
      case 'video': {
        const video = buildVideo(m, toot);

        video.classList.add(`media-${toot.media_attachments.length}`);
        container.appendChild(video);
      }
      }
    });
    panel.appendChild(warned);
  }

  if (toot.card !== null) {
    const card = buildCard(toot.card);

    panel.appendChild(card);
  }

  panel.appendChild(footer);
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

function buildFooter(toot) {
  const buttons = [
    {
      count: 'replies_count',
      emoji: '💬',
      name: 'Reply',
    },
    {
      active: 'reblogged',
      count: 'reblogs_count',
      emoji: '🔁',
      name: 'Reblog',
    },
    {
      active: 'favourited',
      api: '/api/v1/statuses/{id}/favourite',
      count: 'favourites_count',
      emoji: '❤️',
      name: 'Favorite',
    },
    {
      active: 'bookmarked',
      emoji: '🔖',
      name: 'Bookmark',
    },
    {
      emoji: '…',
      name: 'More',
    },
  ];
  const footer = document.createElement('div');

  buttons.forEach((b) => {
    const bText = Object.prototype.hasOwnProperty.call(b, 'count')
      ? `${toot[b.count]} ${b.emoji}`
      : b.emoji;
    const button = document.createElement('button');
    const text = document.createTextNode(bText);

    if (Object.prototype.hasOwnProperty.call(b, 'active') && toot[b.active]) {
      button.classList.add('clicked');
    }

    if (Object.prototype.hasOwnProperty.call(b, 'api')) {
      button.setAttribute(
        'hx-post',
        `https://${config.server}${b.api.replace('{id}', toot.id)}`
      );
      button.setAttribute('hx-trigger', 'click');
    }

    button.title = b.name;
    button.appendChild(text);
    footer.appendChild(button);
  });
  footer.classList.add('footer');
  return footer;
}

function buildCard(cardInfo) {
  const link = document.createElement('a');
  const box = document.createElement('div');
  const img = document.createElement('img');
  const title = document.createElement('h3');
  const titleText = document.createTextNode(cardInfo.title);
  const source = document.createElement('b');
  const sourceName = document.createTextNode(cardInfo.provider_name);
  const description = document.createTextNode(cardInfo.description);
  const break1 = document.createElement('br');
  const break2 = document.createElement('br');
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  const provider = document.createElement('span');
  const prov = document.createTextNode(
    cardInfo.provider_name && cardInfo.provider_name.length > 0
    ? cardInfo.provider_name
    : cardInfo.title
  );

  if (Object.prototype.hasOwnProperty.call(cardInfo, 'image')) {
    img.src = cardInfo.image;
    box.appendChild(img);
  }

  provider.classList.add('card-summary');
  provider.appendChild(prov);
  summary.appendChild(provider);
  source.appendChild(sourceName);
  title.appendChild(titleText);
  box.classList.add('card');
  box.appendChild(title);
  box.appendChild(break1);
  box.appendChild(source);
  box.appendChild(break2);
  box.appendChild(description);
  link.appendChild(box);
  details.appendChild(summary);
  details.appendChild(link);
  return details;
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
  xhr.send(JSON.stringify(data));
}
