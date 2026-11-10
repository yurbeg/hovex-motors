import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  galleryIndexForKey,
  gallerySwipeStep,
  ImageGallery,
  normalizeGalleryIndex,
} from "../src/frontend/public/shared/ImageGallery";

test("gallery index helpers wrap, jump, and reject vertical gestures", () => {
  assert.equal(normalizeGalleryIndex(-1, 3), 2);
  assert.equal(normalizeGalleryIndex(3, 3), 0);
  assert.equal(normalizeGalleryIndex(8, 0), 0);
  assert.equal(galleryIndexForKey("ArrowLeft", 0, 3), 2);
  assert.equal(galleryIndexForKey("ArrowRight", 2, 3), 0);
  assert.equal(galleryIndexForKey("Home", 2, 3), 0);
  assert.equal(galleryIndexForKey("End", 0, 3), 2);
  assert.equal(galleryIndexForKey("Enter", 0, 3), null);
  assert.equal(gallerySwipeStep(-60, 8), 1);
  assert.equal(gallerySwipeStep(60, 8), -1);
  assert.equal(gallerySwipeStep(60, 90), 0);
  assert.equal(gallerySwipeStep(20, 2), 0);
});

test("multi-image gallery exposes labelled carousel controls and thumbnails", () => {
  const html = renderToStaticMarkup(
    <ImageGallery
      name="2026 Test Car"
      images={["/one.jpg", "/two.jpg", "/three.jpg"]}
    />,
  );

  assert.match(html, /role="region"/);
  assert.match(html, /aria-roledescription="carousel"/);
  assert.match(html, /aria-label="2026 Test Car լուսանկարների պատկերասրահ"/);
  assert.match(html, /aria-label="Ցուցադրել նախորդ լուսանկարը"/);
  assert.match(html, /aria-label="Ցուցադրել հաջորդ լուսանկարը"/);
  assert.match(html, /role="status"/);
  assert.match(html, />1 \/ 3</);
  assert.equal(html.match(/aria-pressed=/g)?.length, 3);
});

test("single and empty galleries avoid unusable slider controls", () => {
  const single = renderToStaticMarkup(
    <ImageGallery name="Single" images={["/one.jpg"]} />,
  );
  const empty = renderToStaticMarkup(
    <ImageGallery name="Empty" images={[]} />,
  );

  assert.doesNotMatch(single, /Ցուցադրել նախորդ լուսանկարը/);
  assert.doesNotMatch(single, /Ընտրել լուսանկարը/);
  assert.match(single, />1 \/ 1</);
  assert.match(empty, /role="img"/);
  assert.match(empty, /Մեքենայի լուսանկարը հասանելի չէ/);
});
