export function postMemeImage(
  token: string,
  file: File,
  onProgress: (loaded: number, total: number) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const body = new FormData();
    body.set('file', file, file.name);
    const request = new XMLHttpRequest();
    request.open('POST', `/api/student/${encodeURIComponent(token)}/meme-battle/images`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded, event.total);
    };
    request.onerror = () => {
      resolve({ ok: false, error: `Не удалось загрузить ${file.name}` });
    };
    request.onload = () => {
      let payload: { ok?: boolean; error?: string } = {};
      try {
        payload = JSON.parse(request.responseText) as { ok?: boolean; error?: string };
      } catch {
        resolve({ ok: false, error: `Не удалось загрузить ${file.name}` });
        return;
      }
      if (request.status >= 200 && request.status < 300 && payload.ok) {
        resolve({ ok: true });
        return;
      }
      resolve({ ok: false, error: payload.error || `Не удалось загрузить ${file.name}` });
    };
    request.send(body);
  });
}
