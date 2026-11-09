# Hovex Motors

Hovex Motors-ի համար պատրաստված responsive web prototype՝ ԱՄՆ աճուրդներից մեքենա ընտրելու և մասնագետի հետ խորհրդատվություն ամրագրելու համար։

Frontend-ը կառուցված է React, TypeScript, Tailwind CSS 4 և Vite տեխնոլոգիաներով։ Կոմպոնենտների ամբողջ styling-ը գրված է Tailwind utility class-երով, իսկ միակ ընդհանուր stylesheet-ը պարունակում է միայն Tailwind import-ը, տեղային font-երը և անհրաժեշտ global browser կանոնները։

Կոդի շերտերի և frontend/backend սահմանների ամբողջ նկարագրությունը գտնվում է [`ARCHITECTURE.md`](./ARCHITECTURE.md)-ում, իսկ review-ի արդյունքներն ու մնացած սահմանափակումները՝ [`CODE_REVIEW.md`](./CODE_REVIEW.md)-ում։

## Հնարավորություններ

- մեքենաների որոնում ըստ բյուջեի, տարեթվի և մակնիշի,
- `/catalog` առանձին էջ՝ բազայում հրապարակված բոլոր մեքենաները դիտելու համար,
- demo առաջարկներ՝ նկարներով և ներմուծման գնահատված ամբողջական արժեքով,
- մեքենաների մանրամասներ և համեմատություն,
- Hovex AI օգնական՝ բյուջեով մեքենա ընտրելու և ներմուծման հարցերին պատասխանելու համար,
- խորհրդատվության հայտ և WhatsApp փոխանցում,
- `/admin` հասցեով Supabase Auth-ով պաշտպանված կառավարման վահանակ՝ մեքենաների համար,
- desktop, tablet և mobile տարբերակներ։

> Գլխավոր էջի ընտրված առաջարկների հասցված արժեքները demo գնահատականներ են։
> `/catalog` էջում իրական աճուրդային տվյալներ հայտնվում են միայն AuctionsAPI-ի
> հաջող ներմուծումից հետո և չեն ներկայացվում որպես վերջնական գնման արժեք։

> Supabase-ը կարգավորելուց հետո admin վահանակի մեքենաները պահվում են PostgreSQL բազայում և համաժամեցվում են սարքերի միջև։ Հաճախորդների հարցումները դեռ ցուցադրական են ու պահվում են տվյալ դիտարկիչի `localStorage`-ում։

## AuctionsAPI / Copart կենդանի կատալոգ

`/catalog` էջը կարող է ցուցադրել Supabase-ում ներմուծված ակտիվ Copart լոտերը՝
լուսանկարներով, բնութագրերով, ընթացիկ խաղադրույքով և Buy Now գնով։ AuctionsAPI
գաղտնի բանալին երբեք չի փոխանցվում browser-ին․ ներմուծումն աշխատում է
Supabase Edge Function-ում կամ տեղային server-only հրամանով։ Կարգավորման,
միգրացիաների, փորձնական/ամբողջական ներմուծման և ժամային schedule-ի քայլերը
նկարագրված են [AuctionsAPI ինտեգրման ուղեցույցում](./MOTORAPIS.md)։

AuctionsAPI-ն անկախ տվյալների մատակարար է և կապված չէ Copart-ի, IAAI-ի կամ
Encar-ի հետ։ Պաշտոնական փաստաթղթերը՝
[`auctionsapi.com/docs`](https://auctionsapi.com/docs)։ Repository-ի արդեն
ստեղծված որոշ ներքին ֆայլեր և PostgreSQL անուններ շարունակում են կրել
`motorapis` անունը՝ migration compatibility-ն չխախտելու համար։

## AI օգնական

Օգնականը առանց լրացուցիչ կարգավորման աշխատում է տեղային demo ռեժիմով՝ օգտագործելով միայն հրապարակված մեքենաներն ու կայքի FAQ տվյալները։ Իրական AI backend միացնելու համար `.env` ֆայլում նշեք ձեր server-side endpoint-ը․

```bash
VITE_ASSISTANT_API_URL=https://your-api.example.com/assistant
```

Endpoint-ը պետք է ընդունի `POST` JSON հարցում և վերադարձնի `message.text`, `message.suggested_vehicle_ids` ու `message.quick_replies` դաշտերը։ `OPENAI_API_KEY`-ը պահեք միայն backend-ի secret manager-ում կամ environment-ում․ այն երբեք չպետք է հայտնվի `VITE_*` փոփոխականում կամ browser code-ում։ Եթե endpoint-ը անհասանելի է, օգնականը անվտանգ վերադառնում է տեղային demo պատասխաններին։

## Supabase ցուցադրվող մեքենաներ

Գլխավոր էջի ընտրված առաջարկներն ու admin վահանակը շարունակում են օգտագործել
`vehicles` աղյուսակը։ Միայն `published` գրառումներն են հասանելի հանրային
browser-ին, իսկ `draft` և `archived` մեքենաները պաշտպանված են հարցմամբ և Row
Level Security կանոններով։ Եթե այս աղյուսակի Supabase կապը կարգավորված չէ,
գլխավոր էջի ցուցադրական հոսքը կարող է օգտագործել ներկառուցված demo տվյալները։
Իրական `/catalog` Copart էջը demo fallback չի օգտագործում և կարդում է միայն
նոր `motorapi_catalog` ներկայացումը։

1. Supabase SQL Editor-ում գործարկեք `supabase/migrations/202611050001_create_vehicles.sql` ֆայլը։
2. Նույն տեղում մեկ անգամ գործարկեք `supabase/seed.sql` ֆայլը։
3. `.env.example`-ից ստեղծեք տեղային `.env.local` և լրացրեք `VITE_SUPABASE_URL` ու `VITE_SUPABASE_PUBLISHABLE_KEY` public արժեքները։

Առաջին migration-ը միացնում է Row Level Security-ը․ սովորական browser-ը կարող է միայն կարդալ `published` մեքենաները։ Secret կամ `service_role` key-ը երբեք մի տեղադրեք browser-ի `VITE_*` փոփոխականներում։

## Supabase Admin Auth և մեքենաների կառավարում

`/admin`-ը օգտագործում է email/password Supabase Auth session և առանձին admin allowlist։ Միայն մուտք գործած լինելը բավարար չէ․ վերջնական հասանելիությունը միշտ ստուգվում է PostgreSQL RLS policy-ներով։

1. SQL Editor-ում գործարկեք `supabase/migrations/202611050002_admin_vehicle_access.sql` migration-ը։
2. Նույն տեղում գործարկեք `supabase/migrations/202611050003_vehicle_images_storage.sql` migration-ը։ Այն ստեղծում է public `vehicle-images` Storage bucket, բայց upload/update/delete գործողությունները RLS-ով հասանելի են միայն allowlist-ում գրանցված admin-ին։
3. Dashboard-ի **Authentication → Users** բաժնում ստեղծեք կամ հրավիրեք admin օգտատիրոջը և համոզվեք, որ email-ը հաստատված է։ Public signup-ը կարելի է անջատել, քանի որ admin հաշիվները ստեղծվում են միայն Dashboard-ից։
4. Բացեք `supabase/admin-bootstrap.example.sql`, փոխարինեք `REPLACE_WITH_CONFIRMED_ADMIN_EMAIL@example.com` placeholder-ը հաստատված admin email-ով և մեկ անգամ գործարկեք SQL Editor-ում։ Գաղտնաբառը SQL-ի կամ repository-ի մեջ մի գրեք։
5. Բացեք `/admin` և մուտք գործեք նույն email/password-ով։ Մեքենա ստեղծելը, խմբագրելը, նկար վերբեռնելը, հրապարակելը և արխիվացնելը կպահպանվեն անմիջապես Supabase-ում։

Admin form-ը ընդունում է JPG, PNG, WebP և AVIF նկարներ՝ առավելագույնը 8 ՄԲ։ Նկարը նախ ցուցադրվում է տեղային preview-ով, իսկ **Պահպանել** սեղմելուց հետո վերբեռնվում է Supabase Storage և դրա public URL-ը պահվում է մեքենայի գրառման մեջ։ Browser-ում օգտագործվում է միայն publishable key-ը, ոչ երբեք `service_role` key-ը։

RLS իրավունքները հետևյալն են․

- չմուտք գործած այցելու՝ միայն `published` մեքենաների ընթերցում,
- սովորական authenticated օգտատեր՝ միայն `published` մեքենաների ընթերցում և ոչ մի write,
- allowlist-ում գրանցված admin՝ բոլոր մեքենաների ընթերցում, ավելացում և խմբագրում։

## Տեղային գործարկում

Պահանջվում է Node.js 20 կամ ավելի նոր տարբերակ։

```bash
npm install
npm run dev
```

Կայքը կբացվի `http://localhost:5173` հասցեով։

## Production build

```bash
npm run typecheck
npm run build
npm run test:admin
npm run test:assistant
npm run test:supabase
npm run test:admin-repository
npm run test:admin-image
npm run test:routes
npm run test:sites
```
