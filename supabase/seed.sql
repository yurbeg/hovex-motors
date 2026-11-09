insert into public.vehicles (
  id,
  make,
  model,
  year,
  body,
  mileage,
  fuel,
  damage,
  auction,
  estimate_min,
  estimate_max,
  max_bid,
  image,
  image_position,
  badge,
  accent,
  status,
  inventory_status,
  featured,
  sort_order,
  created_at,
  updated_at
)
values
  (
    'kia-forte-2021', 'Kia', 'Forte LXS', 2021, 'Սեդան', '70 000 մղոն', 'Բենզին',
    'Հետևի թեթև վնասվածք', 'Copart • ցուցադրական', 10000, 11400, 4200,
    '/assets/hovex/kia-forte-lxs.jpg', '50% 50%', 'Բյուջետային ընտրություն', 'green',
    'published', 'at_auction', false, 0, '2026-11-04T08:00:00Z', '2026-11-04T08:00:00Z'
  ),
  (
    'hyundai-elantra-2023', 'Hyundai', 'Elantra SEL', 2023, 'Սեդան', '23 800 մղոն', 'Բենզին',
    'Առջևի թեթև վնասվածք', 'IAA • ցուցադրական', 13000, 14500, 6400,
    '/assets/hovex/presenter-budget-comparison.jpg', '50% 28%', 'Hovex-ի առաջարկ', 'yellow',
    'published', 'in_transit', true, 1, '2026-11-04T08:00:00Z', '2026-11-04T08:00:00Z'
  ),
  (
    'deepal-sl03-2025', 'Deepal', 'SL03 Sport', 2025, 'Սպորտային սեդան', 'Նոր մեքենա', 'Էլեկտրական',
    'Առանց ակնհայտ վնասի', 'Գործընկերային հարթակ • ցուցադրական', 17500, 19200, 14800,
    '/assets/hovex/deepal-sl03-sport.jpg', '50% 53%', 'Էլեկտրական', 'blue',
    'published', 'available', true, 2, '2026-11-04T08:00:00Z', '2026-11-04T08:00:00Z'
  ),
  (
    'deepal-s05-2026', 'Deepal', 'S05', 2026, 'Քրոսովեր', 'Նոր մեքենա', 'Էլեկտրական',
    'Առանց ակնհայտ վնասի', 'Գործընկերային հարթակ • ցուցադրական', 26800, 29200, 22800,
    '/assets/hovex/deepal-s05-lineup.jpg', '50% 34%', 'Նոր մոդել', 'blue',
    'published', 'in_transit', true, 3, '2026-11-04T08:00:00Z', '2026-11-04T08:00:00Z'
  ),
  (
    'hongqi-ehs9-2024', 'Hongqi', 'E-HS9', 2024, 'Ամենագնաց', 'Նոր մեքենա', 'Էլեկտրական',
    'Առանց ակնհայտ վնասի', 'Գործընկերային հարթակ • ցուցադրական', 64000, 69000, 53500,
    '/assets/hovex/hongqi-ehs9.jpg', '50% 60%', 'Պրեմիում', 'black',
    'published', 'available', false, 4, '2026-11-04T08:00:00Z', '2026-11-04T08:00:00Z'
  ),
  (
    'cadillac-escalade-2025', 'Cadillac', 'Escalade IQ Sport 2', 2025, 'Լյուքս ամենագնաց', '13 000 մղոն', 'Էլեկտրական',
    'Տվյալը ենթակա է ստուգման', 'ԱՄՆ աճուրդ • ցուցադրական', 112000, 119000, 99000,
    '/assets/hovex/cadillac-escalade-iq.jpg', '50% 55%', 'ԱՄՆ աճուրդ', 'orange',
    'published', 'at_auction', false, 5, '2026-11-04T08:00:00Z', '2026-11-04T08:00:00Z'
  ),
  (
    'maybach-eqs-2025', 'Mercedes-Maybach', 'EQS 680 SUV', 2025, 'Լյուքս ամենագնաց', '6 900 մղոն', 'Էլեկտրական',
    'Տվյալը ենթակա է ստուգման', 'ԱՄՆ աճուրդ • ցուցադրական', 148000, 162000, 132000,
    '/assets/hovex/mercedes-maybach-eqs-680.jpg', '50% 48%', 'Բացառիկ', 'black',
    'published', 'at_auction', false, 6, '2026-11-04T08:00:00Z', '2026-11-04T08:00:00Z'
  )
on conflict (id) do nothing;
