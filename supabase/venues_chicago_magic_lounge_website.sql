-- Set website for Chicago Magic Lounge
update venues
set website = 'https://chicagomagiclounge.com'
where name ilike '%chicago magic lounge%'
  and website is null;
