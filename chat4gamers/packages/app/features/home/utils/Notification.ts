export function fireDesktopNotification({
  title,
  body,
  serverUrl,
}: {
  title: string
  body: string
  serverUrl: string
}) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return

  // Strip mention syntax from body for readability
  const cleanBody = body.replace(/@[A-Za-z0-9_-]{32,}/g, '@someone')

  const notification = new Notification(title, {
    body: cleanBody,
    icon: '/icon.png', // your app icon
    tag: `mention-${serverUrl}`, // collapses duplicate notifications
  })

  notification.onclick = () => {
    window.focus()
    notification.close()
  }
}
