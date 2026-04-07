-- Add Pacific Coast Association of Magicians to the groups table
delete from groups where name = 'Pacific Coast Association of Magicians';

insert into groups (
  name,
  abbreviation,
  founded_year,
  headquarters,
  country,
  description,
  website,
  membership_type,
  category,
  is_featured
) values (
  'Pacific Coast Association of Magicians',
  'PCAM',
  1930,
  'Western United States',
  'United States',
  'A regional assembly of the International Brotherhood of Magicians serving magicians along the U.S. Pacific Coast. PCAM hosts an annual convention bringing together performers, lecturers, and magic enthusiasts from across the region.',
  'https://www.pcam.net',
  'Open to magicians',
  'Regional',
  true
)
on conflict (name) do nothing;
