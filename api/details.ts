import { VercelRequest, VercelResponse } from '@vercel/node';

const PIXIV_API_URL = 'https://www.pixiv.net/ajax/illust/';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { pid } = req.query;

    if (!pid) {
        return res.status(400).json({ error: true, message: 'pid is required' });
    }

    try {
        const response = await fetch(`${PIXIV_API_URL}${pid}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        const illust = data.body;

        const result = {
            pid: illust.illustId,
            uid: illust.userId,
            page: illust.pageCount,
            create: illust.createDate,
            upload: illust.uploadDate,
            fetch: getFormattedDate(),
            tags: illust.tags.tags.map((tag: any) => tag.tag),
        };

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: true, message: error.message });
    }
}

function getFormattedDate(): string {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const timezoneOffset = '+00:00';

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezoneOffset}`;
}
