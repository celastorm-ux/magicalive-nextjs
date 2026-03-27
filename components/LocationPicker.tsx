"use client";

import { useMemo } from "react";
import {
  countriesForPicker,
  countryUsesStatePicker,
  getCitiesForState,
  getStatesForCountry,
} from "@/lib/locations";

const selectClass =
  "w-full min-w-0 cursor-pointer rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-8 text-sm text-zinc-100 outline-none transition focus:border-[var(--ml-gold)]/50";

export type LocationPickerProps = {
  selectedCountry: string;
  selectedState: string;
  selectedCity: string;
  onCountryChange: (country: string) => void;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  required?: boolean;
  showLabel?: boolean;
  className?: string;
  disabled?: boolean;
};

export function LocationPicker({
  selectedCountry,
  selectedState,
  selectedCity,
  onCountryChange,
  onStateChange,
  onCityChange,
  required = false,
  showLabel = true,
  className = "",
  disabled = false,
}: LocationPickerProps) {
  const countries = useMemo(() => countriesForPicker(), []);

  const showStateDropdown = Boolean(selectedCountry && countryUsesStatePicker(selectedCountry));

  const states = useMemo(
    () => (selectedCountry ? getStatesForCountry(selectedCountry) : []),
    [selectedCountry],
  );

  const cities = useMemo(() => {
    if (!selectedCountry) return [];
    if (!countryUsesStatePicker(selectedCountry)) {
      return getCitiesForState(selectedCountry, "");
    }
    return getCitiesForState(selectedCountry, selectedState);
  }, [selectedCountry, selectedState]);

  const gridClass = showStateDropdown
    ? "grid grid-cols-1 gap-3 sm:grid-cols-3"
    : "grid grid-cols-1 gap-3 sm:grid-cols-2";

  return (
    <div className={`${gridClass} ${className}`}>
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
            onStateChange("");
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
      {showStateDropdown ? (
        <div>
          {showLabel ? (
            <label className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              State / region{required ? " *" : ""}
            </label>
          ) : null}
          <select
            className={selectClass}
            disabled={disabled || !selectedCountry}
            required={required}
            value={selectedState}
            onChange={(e) => {
              onStateChange(e.target.value);
              onCityChange("");
            }}
          >
            <option value="" className="bg-zinc-900">
              Select state…
            </option>
            {states.map((st) => (
              <option key={st} value={st} className="bg-zinc-900">
                {st}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div>
        {showLabel ? (
          <label className="mb-2 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            City{required ? " *" : ""}
          </label>
        ) : null}
        <select
          className={selectClass}
          disabled={
            disabled ||
            !selectedCountry ||
            (showStateDropdown && !selectedState)
          }
          required={required}
          value={selectedCity}
          onChange={(e) => onCityChange(e.target.value)}
        >
          <option value="" className="bg-zinc-900">
            {!selectedCountry
              ? "Choose a country first"
              : showStateDropdown && !selectedState
                ? "Choose a state first"
                : "Select city…"}
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
