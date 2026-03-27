import { ErrorBanner } from 'app/features/home/banners/ErroBanner'
import { UpdateBanner } from 'app/features/home/banners/UpdateBanner'

export function NotificationBanner() {
  const error = false // todo: Replace with actual error state
  return (
    <>
      <UpdateBanner />
      {error && <ErrorBanner />}
    </>
  )
}
