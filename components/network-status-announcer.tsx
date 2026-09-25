"use client";

import { useEffect, useState } from "react";

export function NetworkStatusAnnouncer() {
  const [statusMessage, setStatusMessage] = useState("Garden is online.");

  useEffect(() => {
    const handleOnline = () => {
      setStatusMessage("Garden is back online.");
    };

    const handleOffline = () => {
      setStatusMessage("Garden is offline. Cached content will stay available where possible.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div aria-atomic="true" aria-live="polite" className="sr-only" role="status">
      {statusMessage}
    </div>
  );
}
