# AuctionsAPI / Copart integration

Այս ինտեգրացիան AuctionsAPI-ից Copart-ի ակտիվ կատալոգի պատճենը ներմուծում է
Supabase։ Browser-ը կարդում է միայն անվտանգ `motorapi_catalog` view-ն, իսկ
AuctionsAPI-ի և Supabase-ի գաղտնի բանալիներն օգտագործվում են միայն տեղային
server-side importer-ում կամ Supabase Edge Function-ում։

> Այս ֆայլի, migration-ի, SQL object-ների, Edge Function-ի և որոշ TypeScript
> module-ների `motorapis` անունները պահպանված compatibility identifier-ներ են։
> Դրանք չարժե վերանվանել արդեն կիրառված migration-ներում կամ deployment-ում։
> Տվյալների ընթացիկ մատակարարը **AuctionsAPI**-ն է։

AuctionsAPI-ն անկախ ծառայություն է և կապված չէ Copart-ի, IAAI-ի կամ Encar-ի
հետ։ Հասանելի տվյալները և page-size limit-ը կախված են ձեր key-ի plan-ից։

## Provider contract

- base URL՝ `https://auctionsapi.com/api`;
- authentication՝ `x-api-key` header;
- Copart source՝ `domain_id=3`;
- ակտիվ լոտեր՝ `GET /cars`;
- վաճառված/հեռացված լոտեր՝ `GET /archived-lots`; endpoint-ը `domain_id` filter
  չունի, ուստի source-ը ստուգվում է յուրաքանչյուր event-ի `domain` object-ից;
- incremental window՝ `minutes`, առավելագույնը 4320 րոպե;
- `/cars`-ի `per_page` default-ը 50 է, իսկ առավելագույնը կախված է plan-ից;
- pagination-ը սկսվում է `page=1`-ից և հետևում է response-ի `links.next`-ին
  մինչև այն դառնա `null`; հին կամ `links` չունեցող response-ի համար դատարկ
  `data`-ն օգտագործվում է միայն որպես compatibility fallback։

Մինչև ձեր plan-ի սահմանաչափը հաստատելը թողեք `AUCTIONSAPI_PAGE_SIZE=50`։ Trial
import-ը այս նախագծում հատուկ սահմանափակված է 5 գրառումով և checkpoint չի
առաջացնում։

Պաշտոնական փաստաթղթեր՝ [overview](https://auctionsapi.com/docs),
[quickstart](https://auctionsapi.com/docs/quickstart),
[authentication](https://auctionsapi.com/docs/authentication),
[pagination](https://auctionsapi.com/docs/pagination),
[sync guide](https://auctionsapi.com/docs/guides/sync),
[cars](https://auctionsapi.com/docs/api/cars),
[archived lots](https://auctionsapi.com/docs/api/archived-lots),
[limits](https://auctionsapi.com/docs/limits) և
[OpenAPI 3.0 spec](https://auctionsapi.com/openapi.yaml)։

Provider-ի demo catalog-ը կարելի է բացել այս ձևաչափով՝
`https://auctionsapi.com/docs/demo?key=YOUR_API_KEY`։ Իրական key-ով URL-ը մի
commit արեք, մի ուղարկեք chat-ով և մի հրապարակեք screenshot-ում կամ log-ում։

## 1. Migration և Edge Function

Supabase CLI-ն կապեք անհրաժեշտ project-ին և կիրառեք migration-ները․

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Ստեղծեք Git-ից անտեսվող `.env.auctionsapi` ֆայլը․

```dotenv
AUCTIONSAPI_API_KEY=YOUR_API_KEY
```

`YOUR_API_KEY`-ի փոխարեն գրեք նամակով ստացած key-ի միայն արժեքը՝ առանց
`x-api-key:`, չակերտների կամ demo URL-ի։ Այնուհետև secret-ը փոխանցեք Supabase
և deploy արեք compatibility անունով function-ը․

```bash
npx supabase secrets set --env-file .env.auctionsapi
npx supabase functions deploy motorapis-sync --no-verify-jwt
```

`supabase/config.toml`-ը platform JWT check-ը անջատում է միայն այս
server-to-server function-ի համար։ Function-ը request է ընդունում միայն
Supabase-ի server-only secret key-ով `apikey` header-ում։ Browser-ի
publishable/anon key-ը չի թույլատրվում։

## 2. Trial և ամբողջական import

Repository-ից importer-ը նաև ավտոմատ կարդում է արդեն ստեղծված
`.env.auctionsapi` ֆայլի key-ը։ Git-ից անտեսվող `.env.local`-ում լրացրեք միայն
Supabase-ի server-side արժեքներն ու ցանկալի tuning-ը․

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SERVER_SECRET_KEY

# Safe default until your AuctionsAPI plan limit is confirmed.
AUCTIONSAPI_PAGE_SIZE=50
```

Այնուհետև գործարկեք․

```bash
# Մինչև 5 մեքենա, առանց sync checkpoint-ը առաջ տանելու
npm run auctionsapi:trial

# Ակտիվ Copart լոտերի բոլոր էջերը և archive safety window-ը
npm run auctionsapi:import

# Սովորական incremental sync
npm run auctionsapi:sync
```

Հին `motorapis:trial`, `motorapis:import` և `motorapis:sync` script-երը մնացել
են որպես նույն հրամանների compatibility alias-ներ։

Import-ը idempotent է․ մեքենան թարմացվում է AuctionsAPI vehicle ID-ով, իսկ
լոտը՝ `(source_domain_id, provider_lot_id)` զույգով։ VIN-ը primary key չէ։

## 3. Ժամային schedule

Function-ը deploy անելուց հետո բացեք
`supabase/schedule-motorapis.example.sql`, տեղային փոխարինեք երկու placeholder-ը
և գործարկեք Supabase SQL Editor-ում։ Template-ը project URL-ը և Supabase-ի
server-only secret key-ը պահում է Vault-ում ու ստեղծում է compatibility անունով
`motorapis-hourly` job-ը․

```text
0 * * * *
```

Հաճախականությունը փոխելու համար փոխեք cron expression-ը և կրկին գործարկեք
միայն `cron.unschedule`-ից սկսվող scheduling block-ը։ `vault.create_secret`
կանչերը նախատեսված են մեկանգամյա setup-ի համար։ Արդեն ստեղծված secret-ը
փոխելու ժամանակ օգտագործեք `vault.update_secret`։

## Sync-ի վարքագիծը

- Մի source-ի համար միաժամանակ աշխատում է միայն մեկ run՝ PostgreSQL renewable
  lease-ի միջոցով։
- Բոլոր էջերը կարդացվում են `links.next`-ով մինչև դրա `null` արժեքը։ Հին կամ
  `links` չունեցող response-ի դեպքում դատարկ `data`-ն compatibility fallback է։
- Checkpoint-ը առաջ է գնում միայն active և archive բոլոր անհրաժեշտ էջերի
  հաջող մշակումից հետո։
- Window-ները փոքր չափով overlap են անում։ 72 ժամից ավելի դադարից հետո
  active inventory-ն նորից կարդացվում և upsert է արվում բոլոր էջերով, իսկ
  archive-ը կարդացվում է API-ի հասանելի առավելագույն՝ 4320 րոպեանոց window-ով։
- AuctionsAPI-ի էջերը frozen snapshot չեն․ pagination-ի ընթացքում լոտերը կարող
  են փոխվել կամ տեղափոխվել էջերի միջև։ Այդ պատճառով active էջերից որևէ լոտի
  բացակայությունը երբեք չի նշանակում, որ այն inactive է։ Միայն
  `/archived-lots`-ի հստակ event-ն է լոտը դարձնում inactive՝ առանց history-ն
  ջնջելու։
- 72 ժամից ավելի gap-ի դեպքում 4320 րոպեից հին archive event-ներն այլևս կարող
  են API-ից հասանելի չլինել։ Այդ պատճառով նախկինում ներմուծված հին լոտերը
  կարող են stale active մնալ մինչև provider-supported կամ operator-ի ձեռքով
  անվտանգ reconciliation-ը։
- Provider-ի error-ը չի մաքրում նախկինում հաջող ներմուծված catalog-ը։
- Network error-ները և HTTP `408`, `429`, ու `5xx` պատասխանները կրկին փորձվում
  են սահմանափակ քանակով։ `Retry-After` header-ը կիրառվում է, երբ provider-ը այն
  վերադարձնում է։
- `null`-ը մնում է բացակայող արժեք․ Buy Now, reserve և final bid արժեքները չեն
  փոխարինվում զրոյով։
- Currency չի ենթադրվում․ եթե provider-ը հստակ currency չի վերադարձրել, այն
  մնում է `null`, և UI-ն նշում է, որ արժույթը տրված չէ։

Copart-ի բոլոր active էջերի full traversal-ը պետք է տեղավորվի ձեր Supabase Edge
Function plan-ի execution limit-ի մեջ։ Եթե այն չի հասցնում ավարտվել, երկար աշխատող
server/operator միջավայրում գործարկեք `npm run auctionsapi:import`, ապա թողեք
ժամային incremental schedule-ը շարունակի sync-ը։

## Ստուգումներ

```bash
npm run typecheck
npm run test:auctionsapi
npm run test:auction-catalog
npm run build
npm run test:sites
```

Առանց `AUCTIONSAPI_API_KEY`-ի իրական provider request չի կատարվում, իսկ live
catalog-ը դատարկ է մնում մինչև առաջին հաջող import-ը։
