-- Tags seed data
INSERT INTO tags (slug, category, label_da, label_en) VALUES

  -- sprog (language)
  ('dansk',   'sprog', 'Dansk',   'Danish'),
  ('engelsk', 'sprog', 'Engelsk', 'English'),
  ('norsk',   'sprog', 'Norsk',   'Norwegian'),
  ('svensk',  'sprog', 'Svensk',  'Swedish'),

  -- alderstrin (age)
  ('4-6-aar',   'alderstrin', '4-6 år',   '4-6 years'),
  ('7-9-aar',   'alderstrin', '7-9 år',   '7-9 years'),
  ('10-12-aar', 'alderstrin', '10-12 år', '10-12 years'),

  -- emne (topic)
  ('leg-og-kreativitet', 'emne', 'Leg og kreativitet', 'Play and creativity'),
  ('gaming',             'emne', 'Gaming',             'Gaming'),
  ('sport',              'emne', 'Sport',              'Sport'),
  ('musik',              'emne', 'Musik',              'Music'),
  ('madlavning',         'emne', 'Madlavning',         'Cooking'),
  ('natur-og-dyr',       'emne', 'Natur og dyr',       'Nature and animals'),
  ('videnskab',          'emne', 'Videnskab',          'Science'),
  ('tegnefilm',          'emne', 'Tegnefilm',          'Cartoons'),
  ('humor',              'emne', 'Humor',              'Humor'),
  ('lego',               'emne', 'LEGO',               'LEGO'),

  -- tone
  ('rolig',    'tone', 'Rolig',    'Calm'),
  ('energisk', 'tone', 'Energisk', 'Energetic'),
  ('laererig', 'tone', 'Lærerig',  'Educational'),
  ('sjov',     'tone', 'Sjov',     'Fun');
