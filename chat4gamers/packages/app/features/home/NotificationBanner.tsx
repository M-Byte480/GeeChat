import {ErrorBanner} from "app/features/home/banners/ErroBanner";
import {UpdateBanner} from "app/features/home/banners/UpdateBanner";

export function NotificationBanner(){

  const error = false; // todo: Replace with actual error state
  const updateAvailable = true; // todo: Replace with actual update check

  return (
    <>
     <UpdateBanner />
      {
        error && <ErrorBanner />
      }
    </>
  );
}