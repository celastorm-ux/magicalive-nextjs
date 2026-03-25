"use client";

import { useMemo } from "react";
import { countriesForPicker, getCitiesForCountry } from "@/lib/locations";

const selectClass =
  "w-full min-w-0 cursor-pointer rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-8 text-sm text-zinc-100 outline-none transition focus:border-[var(--ml-gold)]/50";

export type LocationPickerProps = {
  selectedCountry: string;
  selectedCity: string;
  onCountryChange: (country: string) => void;
  onCityChange: (city: string) => void;
  required?: boolean;
  showLabel?: boolean;
  className?: string;
  disabled?: boolean;
};

export function LocationPicker({
  selectedCountry,
  selectedCity,
  onCountryChange,
  onCityChange,
  required = false,
  showLabel = true,
  className = "",
  disabled = false,
}: LocationPickerProps) {
  const countries = useMemo(() => countriesForPicker(), []);
  const cities = useMemo(
    () => (selectedCountry ? getCitiesForCountry(selectedCountry) : []),
    [selectedCountry],
  );

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${className}`}>
      <div>
        {showLabel ? (
          <label className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Country{required ? " *" : ""}
          </label>
        ) : null}
        <select
          className={selectClass}
          disabled={disabled}
          required={required}
          value={selectedCountry}
          onChange={(e) => {
            const next = e.target.value;
            onCountryChange(next);
            onCityChange("");
          }}
        >
          <option value="" className="bg-zinc-900">
            Select country…
          </option>
          {countries.map((c) => (
            <option key={c} value={c} className="bg-zinc-900">
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        {showLabel ? (
          <label className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            City{required ? " *" : ""}
          </label>
        ) : null}
        <select
          className={selectClass}
          disabled={disabled || !selectedCountry}
          required={required}
          value={selectedCity}
          onChange={(e) => onCityChange(e.target.value)}
        >
          <option value="" className="bg-zinc-900">
            {selectedCountry ? "Select city…" : "Choose a country first"}
          </option>
          {cities.map((ct) => (
            <option key={ct} value={ct} className="bg-zinc-900">
              {ct}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
