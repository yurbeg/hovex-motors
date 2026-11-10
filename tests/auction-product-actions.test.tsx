import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { LeadVehicleContext } from "../src/domain/lead";
import {
  AuctionProductActions,
  auctionProductWhatsappUrl,
} from "../src/frontend/public/catalog/AuctionProductActions";

const context: LeadVehicleContext = {
  vehicleId: "copart-123",
  vehicleLabel: "2024 Toyota RAV4 XLE",
  lotId: "98765432",
  vin: "2T3P1RFV9RW123456",
};

const expectedWhatsappMessage = [
  "Բարև, Hovex Motors։ Ցանկանում եմ ստանալ այս մեքենայի ամբողջական հաշվարկը։",
  "Մեքենա՝ 2024 Toyota RAV4 XLE",
  "Lot ID՝ 98765432",
  "VIN՝ 2T3P1RFV9RW123456",
].join("\n");

function countTags(html: string, tag: "a" | "button"): number {
  return html.match(new RegExp(`<${tag}\\b`, "g"))?.length ?? 0;
}

function whatsappMessageFromMarkup(html: string): string | null {
  const match = html.match(/href="(https:\/\/wa\.me\/[^\"]+)"/);
  assert.ok(match, "expected a WhatsApp link");
  return new URL(match[1].replaceAll("&amp;", "&")).searchParams.get("text");
}

test("panel actions render the two lead CTAs plus WhatsApp and phone links", () => {
  const html = renderToStaticMarkup(
    <AuctionProductActions context={context} onRequest={() => {}} />,
  );

  assert.match(html, /aria-label="Մեքենայի գործողություններ"/);
  assert.match(html, /Ստանալ ամբողջական հաշվարկ/);
  assert.match(html, /Խորհրդակցել այս մեքենայի շուրջ/);
  assert.match(html, />WhatsApp<\/a>/);
  assert.match(html, />Զանգ<\/a>/);
  assert.equal(countTags(html, "button"), 2);
  assert.equal(countTags(html, "a"), 2);
  assert.equal(html.match(/<button[^>]*type="button"/g)?.length, 2);
  assert.match(html, /href="tel:\+37433344366"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noreferrer"/);
  assert.equal(whatsappMessageFromMarkup(html), expectedWhatsappMessage);
});

test("mobile actions expose all four actions in a safe-area-aware fixed bar", () => {
  const html = renderToStaticMarkup(
    <AuctionProductActions
      context={context}
      onRequest={() => {}}
      variant="mobile"
    />,
  );

  assert.match(html, /<nav[^>]*aria-label="Մեքենայի արագ գործողություններ"/);
  assert.match(html, /fixed right-0 bottom-0 left-0/);
  assert.match(html, /grid-cols-4/);
  assert.match(html, /env\(safe-area-inset-bottom\)/);
  assert.match(html, /aria-label="Ստանալ ամբողջական հաշվարկ"/);
  assert.match(html, /aria-label="Խորհրդակցել այս մեքենայի շուրջ"/);
  assert.match(html, /aria-label="Գրել WhatsApp-ով այս մեքենայի մասին"/);
  assert.match(html, /aria-label="Զանգահարել 033 344 366"/);
  assert.equal(countTags(html, "button"), 2);
  assert.equal(countTags(html, "a"), 2);
  assert.equal(html.match(/<button[^>]*type="button"/g)?.length, 2);
  assert.match(html, /href="tel:\+37433344366"/);
  assert.equal(whatsappMessageFromMarkup(html), expectedWhatsappMessage);
});

test("WhatsApp metadata describes unavailable lot fields without dropping them", () => {
  const url = new URL(auctionProductWhatsappUrl({
    ...context,
    lotId: null,
    vin: null,
  }));
  const message = url.searchParams.get("text");

  assert.match(message ?? "", /Lot ID՝ Հասանելի չէ/);
  assert.match(message ?? "", /VIN՝ Հասանելի չէ/);
  assert.match(message ?? "", /Մեքենա՝ 2024 Toyota RAV4 XLE/);
});
