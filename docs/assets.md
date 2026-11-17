# Visual assets

## Generated background

`source-assets/gotrajet-road.png` was generated with the built-in image-generation tool. The site uses the optimised `dist/assets/gotrajet-road.webp` on the public website, dashboard, authentication, traveler and impact screens, and it is the background of the social card `og-image.jpg`.

Final prompt:

> Use case: photorealistic-natural. Asset type: website hero background for GOTRAJET, a Moroccan collaborative parcel delivery app. Create one high quality wide landscape photograph, 1536x1024. A clean small white delivery van viewed from behind in three-quarter angle driving away on a gently curving Moroccan intercity paved road through the Atlas foothills at warm golden sunset. The road runs from bottom right into the middle distance, van on right third of composition. Natural Moroccan arid mountain landscape with olive trees, dusty green shrubs and distant mountains, warm sky with thin clouds. Deep navy shadows on left third provide uncluttered negative space for website copy, warm sunlight on right. Premium cinematic editorial travel photography, realistic proportions, no other vehicles, no people, no writing, no text, no logos, no watermark. This is a background photograph only, not a screenshot or phone mockup.

## Stock photographs

- Casablanca coastline: [Unsplash, Hassan II Mosque](https://unsplash.com/photos/a-large-white-building-with-a-green-roof-next-to-the-ocean-ymEGRkA25zQ), photo ID `1706203644187-a719449587bb`, `casablanca-coast.jpg`.
- Moroccan landscape: Unsplash photo ID `1489749798305-4fea3ae63d43`, `marrakech.jpg` (illustrative landscape, not a geolocated destination map).
- Moroccan architecture: Unsplash photo ID `1539020140153-e479b8c22e70`, `fes.jpg` (illustrative architecture).

Images are route illustrations rather than photos of real travelers, vehicles or live deliveries. See the download script for original image endpoints.

## Optimisation

Original PNG/JPG photographs and TTF fonts are kept in `source-assets/` (not deployed). `python scripts/optimize_assets.py` regenerates the WebP images, WOFF2 fonts, `og-image.jpg` (1200×630) and the PNG app icons rendered from `dist/assets/favicon.svg` (the existing inline logo on a navy tile).

## Fonts

DM Sans, Manrope, and Noto Sans Arabic, downloaded from Google Fonts and bundled with local CSS. They use the SIL Open Font License; license files are included in `dist/assets/licenses/`.

## Code assets

The logo treatment and interface icons are inline SVG, styled by the website. They are not bitmap crops of the supplied screenshots.

## Hero background video

`dist/assets/video/hero-1280.(webm|mp4)` (desktop, about 1.2 MB / 1.7 MB) and `hero-854.(webm|mp4)` (phones, about 0.6 MB / 0.7 MB) form a 14.6-second muted loop that tells the GOTRAJET story: **load → travel → deliver**. It is built by `scripts/make_hero_video.py` from three clips under the [Pexels licence](https://www.pexels.com/license/) (free for commercial use, attribution not required, credited here):

| Scene | Pexels clip | Author |
| --- | --- | --- |
| Traveller loads the parcels | [A man placing the boxes inside the car (4169253)](https://www.pexels.com/video/a-man-placing-the-boxes-inside-the-car-4169253/) | Norma Mortenson |
| On the road at dusk | [Van driving on road in mountains during sunset (10251672)](https://www.pexels.com/video/van-driving-on-road-in-mountains-druign-sunset-10251672/) | Matvey Ilyin |
| Handoff at destination | [A delivery man rolls down the window of a van and delivers a package (6868105)](https://www.pexels.com/video/a-delivery-man-rolls-down-the-window-of-a-van-and-delivers-a-package-6868105/) | Kindel Media |

The clips are illustrative stock footage, not real GOTRAJET users. For production, consider filming your own footage in Morocco (real travellers, Moroccan roads and cities) and rebuilding with the same script.

