"use client";

import { useEffect, useState } from "react";

export type Identity = {
  name?: string;
  role?: string;
};

export function useIdentity(): Identity {
  const [identity, setIdentity] = useState<Identity>({});

  useEffect(() => {
    let active = true;
    const load = () => {
      fetch("/api/identity", { cache: "no-store" })
        .then((response) => response.json() as Promise<Identity>)
        .then((value) => {
          if (active) setIdentity(value);
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 6000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return identity;
}
