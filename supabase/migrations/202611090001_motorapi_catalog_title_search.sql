begin;

-- Some provider rows have a descriptive title but no normalized make/model.
-- Keep those rows discoverable through the catalog's free-text search.
create or replace view public.motorapi_catalog
with (security_barrier = true)
as
select
  'copart-' || lots.provider_lot_id::text as id,
  lots.provider_vehicle_id,
  lots.provider_lot_id,
  lots.source_domain_id,
  lots.source_slug,
  lots.lot_number,
  vehicles.vin,
  vehicles.title,
  vehicles.year,
  vehicles.manufacturer_id,
  vehicles.make,
  vehicles.model_id,
  vehicles.model,
  vehicles.generation_id,
  vehicles.generation,
  vehicles.vehicle_type,
  vehicles.body_type,
  vehicles.engine_name,
  vehicles.engine_name as engine,
  vehicles.cylinders,
  vehicles.fuel_type,
  vehicles.transmission,
  vehicles.drive_wheel,
  vehicles.color,
  vehicles.condition,
  vehicles.document_title,
  lots.provider_status_id,
  lots.provider_status,
  lots.odometer_mi,
  lots.odometer_km,
  case
    when lots.odometer_mi is not null then lots.odometer_mi
    else lots.odometer_km
  end as odometer_value,
  case
    when lots.odometer_mi is not null then 'mi'
    when lots.odometer_km is not null then 'km'
    else null
  end as odometer_unit,
  lots.odometer_status,
  lots.primary_damage,
  lots.secondary_damage,
  lots.location_name,
  lots.location_city,
  lots.location_state_code,
  lots.location_country,
  coalesce(
    nullif(btrim(lots.location_name), ''),
    nullif(concat_ws(
      ', ',
      nullif(btrim(lots.location_city), ''),
      nullif(btrim(lots.location_state_code), ''),
      nullif(btrim(lots.location_country), '')
    ), '')
  ) as location,
  lots.sale_at,
  lots.sale_at as sale_date,
  lots.sale_updated_at,
  lots.provider_status as status,
  lots.current_bid,
  lots.current_bid_updated_at,
  lots.buy_now_price,
  lots.buy_now_updated_at,
  lots.final_bid,
  lots.final_bid_updated_at,
  lots.seller_reserve,
  lots.seller_reserve_updated_at,
  greatest(
    lots.current_bid_updated_at,
    lots.buy_now_updated_at,
    lots.final_bid_updated_at,
    lots.seller_reserve_updated_at
  ) as price_updated_at,
  lots.currency,
  lots.buyer_country,
  lots.photo_urls,
  jsonb_strip_nulls(jsonb_build_object(
    'keys_available', lots.characteristics -> 'keys_available',
    'airbags', coalesce(
      lots.characteristics #> '{airbags,name}',
      case
        when jsonb_typeof(lots.characteristics -> 'airbags') in ('string', 'number', 'boolean')
          then lots.characteristics -> 'airbags'
      end
    ),
    'condition', coalesce(
      lots.characteristics #> '{condition,name}',
      case
        when jsonb_typeof(lots.characteristics -> 'condition') in ('string', 'number', 'boolean')
          then lots.characteristics -> 'condition'
      end
    ),
    'title_type', lots.characteristics #> '{title,name}',
    'detailed_title', lots.characteristics #> '{detailed_title,name}',
    'tags', case
      when jsonb_typeof(lots.characteristics -> 'tags') = 'array'
        then lots.characteristics -> 'tags'
    end,
    'is_timed_auction', lots.characteristics -> 'is_timed_auction',
    'auction_type', lots.characteristics #> '{auction_type,name}'
  )) as characteristics,
  vehicles.provider_updated_at as vehicle_provider_updated_at,
  lots.provider_updated_at as lot_provider_updated_at,
  greatest(vehicles.provider_updated_at, lots.provider_updated_at) as provider_updated_at,
  greatest(vehicles.fetched_at, lots.fetched_at) as fetched_at,
  lower(concat_ws(
    ' ',
    vehicles.title,
    vehicles.make,
    vehicles.model,
    vehicles.generation,
    vehicles.year::text,
    vehicles.vin,
    vehicles.body_type,
    vehicles.fuel_type,
    vehicles.transmission,
    vehicles.drive_wheel,
    vehicles.color,
    lots.lot_number,
    lots.primary_damage,
    lots.secondary_damage,
    lots.location_name,
    lots.location_city,
    lots.location_state_code,
    lots.location_country
  )) as search_text
from public.motorapi_lots as lots
join public.motorapi_vehicles as vehicles
  on vehicles.provider_vehicle_id = lots.provider_vehicle_id
where lots.source_domain_id = 3
  and lots.active;

comment on view public.motorapi_catalog is
  'Public display-safe active Copart catalog backed by locally synchronized data';

commit;
