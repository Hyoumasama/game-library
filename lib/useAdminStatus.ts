"use client";

import { useEffect, useState } from "react";

// Every page independently asked `/api/admin/me` whether the viewer is an
// admin (AppNav, AuthButton, HomePageClient, AllGamesClient,
// GameAdminActions all did their own fetch). This module shares one
// in-flight request and caches the result for the life of the tab, so a
// single page load makes at most one `/api/admin/me` call no matter how
// many components ask.
let cachedIsAdmin: boolean | null = null;
let inflightRequest: Promise<boolean> | null = null;
const listeners = new Set<(value: boolean) => void>();

async function fetchAdminStatus(): Promise<boolean> {
  const response = await fetch("/api/admin/me");
  const data = await response.json();
  return Boolean(data.isAdmin);
}

function loadAdminStatus(): Promise<boolean> {
  if (cachedIsAdmin !== null) return Promise.resolve(cachedIsAdmin);

  if (!inflightRequest) {
    inflightRequest = fetchAdminStatus()
      .then((value) => {
        cachedIsAdmin = value;
        inflightRequest = null;
        listeners.forEach((listener) => listener(value));
        return value;
      })
      .catch(() => {
        inflightRequest = null;
        return false;
      });
  }

  return inflightRequest;
}

/** Call after a successful login/logout to update every mounted consumer instantly. */
export function setAdminStatus(value: boolean) {
  cachedIsAdmin = value;
  listeners.forEach((listener) => listener(value));
}

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(cachedIsAdmin ?? false);

  useEffect(() => {
    let active = true;
    listeners.add(setIsAdmin);

    loadAdminStatus().then((value) => {
      if (active) setIsAdmin(value);
    });

    return () => {
      active = false;
      listeners.delete(setIsAdmin);
    };
  }, []);

  return isAdmin;
}
