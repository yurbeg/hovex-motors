import type { Vehicle } from "./adminStore";

export type CatalogVehicle = Pick<
  Vehicle,
  | "id"
  | "make"
  | "model"
  | "year"
  | "body"
  | "mileage"
  | "fuel"
  | "damage"
  | "auction"
  | "estimateMin"
  | "estimateMax"
  | "maxBid"
  | "image"
  | "imagePosition"
  | "badge"
  | "accent"
>;

export interface FaqItem {
  question: string;
  answer: string;
}

export const vehicles: CatalogVehicle[] = [
  {
    id: "kia-forte-2021",
    make: "Kia",
    model: "Forte LXS",
    year: 2021,
    body: "Սեդան",
    mileage: "70 000 մղոն",
    fuel: "Բենզին",
    damage: "Հետևի թեթև վնասվածք",
    auction: "Copart • ցուցադրական",
    estimateMin: 10000,
    estimateMax: 11400,
    maxBid: 4200,
    image: "/assets/hovex/kia-forte-lxs.jpg",
    imagePosition: "50% 50%",
    badge: "Բյուջետային ընտրություն",
    accent: "green",
  },
  {
    id: "hyundai-elantra-2023",
    make: "Hyundai",
    model: "Elantra SEL",
    year: 2023,
    body: "Սեդան",
    mileage: "23 800 մղոն",
    fuel: "Բենզին",
    damage: "Առջևի թեթև վնասվածք",
    auction: "IAA • ցուցադրական",
    estimateMin: 13000,
    estimateMax: 14500,
    maxBid: 6400,
    image: "/assets/hovex/presenter-budget-comparison.jpg",
    imagePosition: "50% 28%",
    badge: "Hovex-ի առաջարկ",
    accent: "yellow",
  },
  {
    id: "deepal-sl03-2025",
    make: "Deepal",
    model: "SL03 Sport",
    year: 2025,
    body: "Սպորտային սեդան",
    mileage: "Նոր մեքենա",
    fuel: "Էլեկտրական",
    damage: "Առանց ակնհայտ վնասի",
    auction: "Գործընկերային հարթակ • ցուցադրական",
    estimateMin: 17500,
    estimateMax: 19200,
    maxBid: 14800,
    image: "/assets/hovex/deepal-sl03-sport.jpg",
    imagePosition: "50% 53%",
    badge: "Էլեկտրական",
    accent: "blue",
  },
  {
    id: "deepal-s05-2026",
    make: "Deepal",
    model: "S05",
    year: 2026,
    body: "Քրոսովեր",
    mileage: "Նոր մեքենա",
    fuel: "Էլեկտրական",
    damage: "Առանց ակնհայտ վնասի",
    auction: "Գործընկերային հարթակ • ցուցադրական",
    estimateMin: 26800,
    estimateMax: 29200,
    maxBid: 22800,
    image: "/assets/hovex/deepal-s05-lineup.jpg",
    imagePosition: "50% 34%",
    badge: "Նոր մոդել",
    accent: "blue",
  },
  {
    id: "hongqi-ehs9-2024",
    make: "Hongqi",
    model: "E-HS9",
    year: 2024,
    body: "Ամենագնաց",
    mileage: "Նոր մեքենա",
    fuel: "Էլեկտրական",
    damage: "Առանց ակնհայտ վնասի",
    auction: "Գործընկերային հարթակ • ցուցադրական",
    estimateMin: 64000,
    estimateMax: 69000,
    maxBid: 53500,
    image: "/assets/hovex/hongqi-ehs9.jpg",
    imagePosition: "50% 60%",
    badge: "Պրեմիում",
    accent: "black",
  },
  {
    id: "cadillac-escalade-2025",
    make: "Cadillac",
    model: "Escalade IQ Sport 2",
    year: 2025,
    body: "Լյուքս ամենագնաց",
    mileage: "13 000 մղոն",
    fuel: "Էլեկտրական",
    damage: "Տվյալը ենթակա է ստուգման",
    auction: "ԱՄՆ աճուրդ • ցուցադրական",
    estimateMin: 112000,
    estimateMax: 119000,
    maxBid: 99000,
    image: "/assets/hovex/cadillac-escalade-iq.jpg",
    imagePosition: "50% 55%",
    badge: "ԱՄՆ աճուրդ",
    accent: "orange",
  },
  {
    id: "maybach-eqs-2025",
    make: "Mercedes-Maybach",
    model: "EQS 680 SUV",
    year: 2025,
    body: "Լյուքս ամենագնաց",
    mileage: "6 900 մղոն",
    fuel: "Էլեկտրական",
    damage: "Տվյալը ենթակա է ստուգման",
    auction: "ԱՄՆ աճուրդ • ցուցադրական",
    estimateMin: 148000,
    estimateMax: 162000,
    maxBid: 132000,
    image: "/assets/hovex/mercedes-maybach-eqs-680.jpg",
    imagePosition: "50% 48%",
    badge: "Բացառիկ",
    accent: "black",
  },
];

export const faqs: FaqItem[] = [
  {
    question: "Ցուցադրված գինը վերջնակա՞ն է։",
    answer:
      "Ոչ։ Դա Հայաստան հասցնելու նախնական միջակայք է։ Վերջնական գինը հաշվարկվում է կոնկրետ լոտը, աճուրդի վճարները, փոխարժեքը և տեղափոխման երթուղին ստուգելուց հետո։",
  },
  {
    question: "Ի՞նչ է ներառում «Հայաստան հասցված արժեքը»։",
    answer:
      "Այն ներառում է գնման սցենարը, աճուրդի վճարները, ԱՄՆ-ի ներպետական և ծովային փոխադրումը, մաքսազերծումն ու Hovex Motors-ի ծառայությունը։ Վերանորոգումը ներառվում է միայն առանձին նշման դեպքում։",
  },
  {
    question: "Ինչո՞ւ է գինը ներկայացված միջակայքով։",
    answer:
      "Աճուրդի վերջնական գինը, փոխարժեքը, նավահանգիստը և լոգիստիկ վճարները կարող են փոփոխվել։ Միջակայքը օգնում է նախապես գնահատել իրատեսական ընդհանուր բյուջեն։",
  },
  {
    question: "Ինչպե՞ս եք ստուգում մեքենան։",
    answer:
      "Մասնագետը ստուգում է VIN համարը, սեփականության փաստաթուղթը, վնասվածքի տեսակը, աճուրդային լուսանկարները և հասանելի պատմությունը՝ մինչև խաղադրույք կատարելը։",
  },
  {
    question: "Որքա՞ն է տևում ներմուծումը։",
    answer:
      "Սովորաբար գործընթացը տևում է մոտ 8–14 շաբաթ։ Ժամկետը կախված է մեքենայի գտնվելու վայրից, նավահանգստից, փոխադրման գրաֆիկից և մաքսային գործընթացից։",
  },
  {
    question: "Որոնման համար պարտադի՞ր է գրանցվել։",
    answer:
      "Ոչ։ Կարող եք որոնել, համեմատել և խորհրդատվություն ամրագրել առանց հաշիվ ստեղծելու։",
  },
];

export const priceSteps: string[] = [
  "Մեքենայի գնում",
  "Աճուրդի վճար",
  "ԱՄՆ տեղափոխում",
  "Ծովային առաքում",
  "Մաքսազերծում",
  "Hovex ծառայություն",
];

export const makeOptions: string[] = [
  "Բոլոր մակնիշները",
  "Cadillac",
  "Deepal",
  "Hongqi",
  "Hyundai",
  "Kia",
  "Mercedes-Maybach",
];
