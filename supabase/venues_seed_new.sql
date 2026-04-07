-- Seed three new venues

insert into public.venues (
  name, city, state, country, full_address, venue_type, website, is_verified
) values
(
  'Poe''s Magic Theatre',
  'Baltimore',
  'MD',
  'United States',
  '20 W Baltimore St, Baltimore, MD 21201',
  'Theater',
  'https://poesmagic.com/',
  true
),
(
  'The French Drop Bar',
  'Osaka',
  null,
  'Japan',
  '〒542-0072 Osaka, Chuo Ward, Kozu, 1 Chome−2−18',
  'Bar',
  'https://www.frenchdropmagic.com/book',
  true
),
(
  'Illusions Bar & Theater',
  'Baltimore',
  'MD',
  'United States',
  '1025 S Charles St, Baltimore, MD 21230',
  'Bar & Theater',
  'http://www.illusionsmagicbar.com/',
  true
)
on conflict do nothing;
