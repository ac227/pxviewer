import { VercelRequest, VercelResponse } from '@vercel/node';

const PIXIV_API_BASE_URL = 'https://www.pixiv.net/ajax/illust/';
const PIXIV_PAGE_API_BASE_URL = 'https://www.pixiv.net/ajax/illust/{}/pages';

const HEADERS = {
  'Referer': 'https://www.pixiv.net/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pid = req.query.pid as string;
  if (!pid || !/^\d+$/.test(pid)) {
    return res.status(400).send(`invalid pid ${now}`);
  }

  try {
    const infoRes = await fetch(`${PIXIV_API_BASE_URL}${pid}`, { headers: HEADERS });
    if (!infoRes.ok) throw new Error('info fetch failed');
    const info = await infoRes.json();
    if (info.error) throw new Error('not found');

    const pagesRes = await fetch(PIXIV_PAGE_API_BASE_URL.replace('{}', pid), { headers: HEADERS });
    if (!pagesRes.ok) throw new Error('pages fetch failed');
    const pages = await pagesRes.json();

    const body = info.body;
    const title = (body.illustTitle || 'Untitled').replace(/[<>&"']/g, ' ');
    const artist = body.userName || 'Unknown';
    const uid = body.userId || '0';
    const pagesCount = body.pageCount || 1;
    const uploadDate = body.uploadDate?.slice(0, 10) || 'unknown';
    const views = (body.viewCount || 0).toLocaleString();
    const likes = (body.likeCount || 0).toLocaleString();
    const bookmarks = (body.bookmarkCount || 0).toLocaleString();

    const origUrls = pages.body.map((p: any) => p.urls.original.replace('i.pximg.net', 'i.pixiv.re'));
    const thumbUrls = pages.body.map((p: any) => p.urls.regular.replace('i.pximg.net', 'i.pixiv.re'));

    const images = thumbUrls.map((thumb, i) => `
      <div class="img-container">
        <a href="${origUrls[i]}" target="_blank">
          <img src="${thumb}" alt="page ${i+1}" loading="lazy">
        </a>
      </div>
    `).join('');

    const html = `
<!DOCTYPE html>
<html lang="en" data-theme="auto">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Pixiv</title>
  <style>
    :root {
      --bg: #f9f9f9;
      --text: #111111;
      --card: #ffffff;
      --border: #e0e0e0;
      --gray: #666666;
      --link: #0066cc;
    }
    [data-theme="dark"] {
      --bg: #111111;
      --text: #dddddd;
      --card: #1a1a1a;
      --border: #333333;
      --gray: #999999;
      --link: #66aaff;
    }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 20px 16px;
    }
    h1 {
      font-size: 2.2rem;
      margin: 2rem 0 2.5rem;
      text-align: center;
      word-break: break-word;
    }
    .info {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1.4rem;
      margin-bottom: 2.5rem;
    }
    .info dl {
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.9rem 1.4rem;
    }
    .info dt {
      font-weight: 600;
      color: var(--link);
    }
    .info dd {
      margin: 0;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }
    .img-container {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
    }
    .img-container img {
      width: 100%;
      height: auto;
      display: block;
    }
    .fetch-time {
      color: var(--gray);
      font-size: 0.9rem;
      text-align: right;
      margin-top: 1.5rem;
    }
    @media (prefers-color-scheme: dark) {
      html:not([data-theme="light"]) {
        --bg: #111111;
        --text: #dddddd;
        --card: #1a1a1a;
        --border: #333333;
        --gray: #999999;
        --link: #66aaff;
      }
    }
  </style>
</head>
<body>

  <div class="container">
    <h1>${title}</h1>

    <div class="info">
      <dl>
        <div>
          <dt>Title</dt>
          <dd>${title}</dd>
        </div>
        <div>
          <dt>PID</dt>
          <dd>${pid}</dd>
        </div>
        <div>
          <dt>Artist</dt>
          <dd>${artist}</dd>
        </div>
        <div>
          <dt>UID</dt>
          <dd>${uid}</dd>
        </div>
        <div>
          <dt>Pages</dt>
          <dd>${pagesCount}</dd>
        </div>
        <div>
          <dt>Upload</dt>
          <dd>${uploadDate}</dd>
        </div>
        <div>
          <dt>Views</dt>
          <dd>${views}</dd>
        </div>
        <div>
          <dt>Likes</dt>
          <dd>${likes}</dd>
        </div>
        <div>
          <dt>Bookmarks</dt>
          <dd>${bookmarks}</dd>
        </div>
      </dl>
      <div class="fetch-time">
        Fetched: ${now} UTC
      </div>
    </div>

    <div class="gallery">
      ${images}
    </div>
  </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (err: any) {
    res.status(500).send(`failed ${pid} ${err.message || 'Unknown error'} ${now}`);
  }
}