# Hovex code review

## Այս refactor-ում շտկվածը

- Domain model-ները (`Vehicle`, `Lead`) առանձնացվել են browser persistence-ից և Supabase row type-երից։
- Static content-ը, `localStorage` store-ը և Supabase browser adapter-ները տեղափոխվել են հստակ `content`, `domain` և `infrastructure` շերտեր։
- Vehicle row-ի snake_case → camelCase mapping-ը դարձել է մեկ ընդհանուր mapper՝ public և admin repository-ների համար։
- Հին import path-երը պահպանվել են բարակ compatibility facade-ներով, որպեսզի գործող կոդն ու թեստերը չկոտրվեն։
- Փաստաթղթավորվել է trust boundary-ն՝ `src/`-ը frontend/browser code է, իսկ `supabase/`-ը՝ database/Auth/RLS/Storage backend configuration։
- Admin bootstrap example-ից հեռացվել է իրական email-ը և վերադարձվել է անվտանգ placeholder-ը։
- Public և admin monolith component-ները բաժանվել են feature/page/hook/UI փոքր մոդուլների, իսկ հին entry path-երը մնացել են միայն որպես compatibility facade։
- Home/catalog կրկնվող compare, modal, notice և consultation state-ը միավորվել է ընդհանուր hook-ում։
- Admin mutation/refresh մրցակցությունները, auth verification race-ը, drawer focus trap-ը և editor identity reset-ը շտկվել են։
- Admin update-ները ստուգում են նախորդ `updated_at` տարբերակը, որպեսզի մեկ այլ tab/device-ի ավելի նոր փոփոխությունը լուռ չվերագրվի։
- Public fallback catalog-ը այժմ իր շերտում պարտադիր զտում է միայն `published` մեքենաները, իսկ Supabase adapter-ը այլևս կախված չէ browser store-ից։
- Consultation lead-երը տեղափոխվել են պաշտպանված Supabase table, իսկ public
  form-ը գրում է միայն server-side `submit-lead` Edge Function-ով՝ validation,
  consent audit, rate limit և idempotency պաշտպանությամբ։
- Admin հարցումները այլևս localStorage fallback չունեն․ list/status update-ը
  RLS-ով պաշտպանված Supabase repository-ից է, optimistic conflict check-ով։

## Կարևոր մնացած prototype սահմանափակումները

- Repository-ում always-on Node.js backend չկա։ Privileged lead intake-ը և
  AuctionsAPI sync-ը Supabase Edge Functions են։ Browser-ը Supabase-ին միանում
  է միայն publishable key-ով, իսկ AI endpoint-ը արտաքին server-ի contract է։
  Secret կամ `service_role` key browser code-ում տեղադրելը անթույլատրելի է։
- Admin UI-ի membership check-ը միայն UX gate է։ Իրական authorization boundary-ն PostgreSQL և Storage RLS policy-ներն են։
- Image upload-ից հետո vehicle save-ի ձախողման դեպքում վերբեռնված object-ը կարող է orphan մնալ։ Նկարը փոխարինելիս հին object-ի ավտոմատ cleanup նույնպես չկա։
- Admin allowlist-ը հիմա singleton է և աջակցում է առավելագույնը մեկ admin-ի։
- Repository/service և հիմնական server-rendered UI contract test-եր կան, բայց
  լիարժեք browser interaction և end-to-end coverage-ը դեռ սահմանափակ է։
- Գործող Supabase unit test-երը չեն գործարկում deployed RLS/Storage policy-ները, հետևաբար չեն ապացուցում իրական environment-ի permission-ները։

## Առաջարկվող հաջորդ քայլերը

1. Non-production Supabase project-ում ավտոմատ integration check-երով ստուգել
   lead-ի anon/non-admin/admin/service-role RLS-ը և հետո catalog/Storage դերերը։
2. Lead-երի համար սահմանել retention/purge քաղաքականություն և մեծ ցուցակի
   համար ավելացնել cursor pagination կամ server-side export։
3. Image lifecycle-ի համար ավելացնել cleanup՝ failed save-ից հետո նոր object-ը ջնջել, successful replacement-ից հետո հինը հեռացնել և պարբերաբար մաքրել չկապված object-ները։
4. Ընդլայնել component և E2E test-երը հիմնական հոսքերի համար՝ `/`, `/catalog`, `/admin`, auth gate, filters, compare, consultation և vehicle editor/upload։
5. Եթե անհրաժեշտ են մի քանի admin-ներ, ավելացնել նոր migration, որը հեռացնում է singleton սահմանափակումը՝ առանց արդեն կիրառված migration-ները վերագրելու։
6. Future AI կամ այլ privileged integration-ները տեղադրել server/Edge Function-ում և secrets-ը պահել միայն server-side secret manager-ում։
