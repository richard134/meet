// Copies text that is still being fetched. Safari only allows clipboard writes
// straight from a click, and awaiting a fetch first loses that; a ClipboardItem
// holding a promise is the way to let the text arrive later.
export function copyWhenReady(text: Promise<string>): Promise<void> {
  if (typeof ClipboardItem !== 'undefined') {
    return navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': text.then((t) => new Blob([t], { type: 'text/plain' })),
      }),
    ]);
  }
  return text.then((t) => navigator.clipboard.writeText(t));
}

// POSTs to one of our link-minting endpoints and returns the absolute URL.
export async function fetchLink(endpoint: string): Promise<string> {
  const response = await fetch(endpoint, { method: 'POST' });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const { path } = await response.json();
  return new URL(path, window.location.origin).href;
}
