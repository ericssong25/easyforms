"use client";

import { useState, useRef, useCallback } from "react";

interface NominatimResult {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    street?: string;
    path?: string;
    pedestrian?: string;
    footway?: string;
    cycleway?: string;
    building?: string;
    amenity?: string;
    shop?: string;
    office?: string;
    neighbourhood?: string;
    suburb?: string;
    hamlet?: string;
    isolated_dwelling?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export interface AddressParts {
  address: string;
  city: string;
  state: string;
  zip: string;
}

let lastRequestTime = 0;

export function useAddressAutocomplete() {
  const [suggestions, setSuggestions] = useState<
    { label: string; data: AddressParts }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < 1000) {
      await new Promise((r) => setTimeout(r, 1000 - elapsed));
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      lastRequestTime = Date.now();
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&limit=5&countrycodes=us&addressdetails=1`,
        { signal: controller.signal }
      );

      if (!res.ok) throw new Error("Nominatim error");

      const data: NominatimResult[] = await res.json();
      const results = data.map((place) => {
        const addr = place.address;

        // Build street from multiple possible field names
        const streetNumber = addr.house_number || "";
        const streetName =
          addr.road ||
          addr.street ||
          addr.path ||
          addr.pedestrian ||
          addr.footway ||
          addr.cycleway ||
          "";

        let street = [streetNumber, streetName]
          .filter(Boolean)
          .join(" ")
          .trim();

        // Fallback: named locations without street
        if (!street) {
          street =
            addr.building ||
            addr.amenity ||
            addr.shop ||
            addr.office ||
            "";
        }
        if (!street) {
          street =
            addr.neighbourhood ||
            addr.suburb ||
            addr.hamlet ||
            addr.isolated_dwelling ||
            "";
        }
        // Ultimate fallback: first line of display_name
        if (!street) {
          street = place.display_name.split(",")[0].trim();
        }

        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.county ||
          "";
        const state = addr.state || "";
        const zip = addr.postcode || "";

        return {
          label: place.display_name,
          data: {
            address: street,
            city,
            state,
            zip,
          },
        };
      });

      setSuggestions(results);
      setOpen(results.length > 0);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Address search error:", err);
      }
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectSuggestion = useCallback(
    (item: { label: string; data: AddressParts }) => {
      setOpen(false);
      setSuggestions([]);
      return item.data;
    },
    []
  );

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return { suggestions, loading, open, search, selectSuggestion, close };
}
