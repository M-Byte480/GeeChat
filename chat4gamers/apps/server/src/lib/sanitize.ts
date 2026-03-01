/** Strip HTML/script tags and cap message length */
export const sanitize = (text: string): string =>
  text.replace(/<[^>]*>/g, '').trim().slice(0, 2000)
