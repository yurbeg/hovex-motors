# Hovex Motors

Hovex Motors-ի համար պատրաստված responsive web prototype՝ ԱՄՆ աճուրդներից մեքենա ընտրելու և մասնագետի հետ խորհրդատվություն ամրագրելու համար։

## Հնարավորություններ

- մեքենաների որոնում ըստ բյուջեի, տարեթվի և մակնիշի,
- demo առաջարկներ՝ նկարներով և ներմուծման գնահատված ամբողջական արժեքով,
- մեքենաների մանրամասներ և համեմատություն,
- Hovex AI օգնական՝ բյուջեով մեքենա ընտրելու և ներմուծման հարցերին պատասխանելու համար,
- խորհրդատվության հայտ և WhatsApp փոխանցում,
- `/admin` հասցեով կառավարման վահանակ՝ մեքենաների և հարցումների համար,
- desktop, tablet և mobile տարբերակներ։

> Աճուրդային տվյալներն ու գները demo գնահատականներ են։ Իրական տվյալների համար անհրաժեշտ է միացնել լիցենզավորված auction data provider։

> Admin վահանակը ցուցադրական է․ մեքենաների փոփոխություններն ու հարցումները պահվում են դիտարկիչի `localStorage`-ում և չեն համաժամեցվում այլ սարքերի հետ։ Production տարբերակի համար անհրաժեշտ են server-side authentication և database։

## AI օգնական

Օգնականը առանց լրացուցիչ կարգավորման աշխատում է տեղային demo ռեժիմով՝ օգտագործելով միայն հրապարակված մեքենաներն ու կայքի FAQ տվյալները։ Իրական AI backend միացնելու համար `.env` ֆայլում նշեք ձեր server-side endpoint-ը․

```bash
VITE_ASSISTANT_API_URL=https://your-api.example.com/assistant
```

Endpoint-ը պետք է ընդունի `POST` JSON հարցում և վերադարձնի `message.text`, `message.suggested_vehicle_ids` ու `message.quick_replies` դաշտերը։ `OPENAI_API_KEY`-ը պահեք միայն backend-ի secret manager-ում կամ environment-ում․ այն երբեք չպետք է հայտնվի `VITE_*` փոփոխականում կամ browser code-ում։ Եթե endpoint-ը անհասանելի է, օգնականը անվտանգ վերադառնում է տեղային demo պատասխաններին։

## Տեղային գործարկում

Պահանջվում է Node.js 20 կամ ավելի նոր տարբերակ։

```bash
npm install
npm run dev
```

Կայքը կբացվի `http://localhost:5173` հասցեով։

## Production build

```bash
npm run build
npm run test:assistant
npm run test:sites
```
