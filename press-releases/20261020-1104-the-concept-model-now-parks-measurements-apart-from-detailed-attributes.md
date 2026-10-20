# The Concept Model Now Parks Measurements Apart From Detailed Attributes

**20 October 2026**

AgileDataGuides today released measurements as their own kind of parked item in the Concept Model app, so a team can park something counted or measured straight from a story and find it apart from the detailed attributes.

## The Problem

While reading a story in Step 4, a team meets two kinds of words that are not Concepts. Some are information about a Concept, like Customer name: a detailed attribute, parked for the DESIGN stage. Others are things counted or measured, like Order value. The app only knew detailed attributes, so a measurement was parked as one, and the Parked Details page mixed the two in a single list with no way to tell them apart or find one again.

## The Solution

Select words in a story in Step 4 and a third button now sits beside Add as a Concept and Park as a detailed attribute: Park as a measurement. The Parked Details page, under Other, lists the two kinds in their own sections, Detailed attributes and Measurements, each with its count.

## How It Works

One add box at the top of Parked Details parks either kind: pick Detailed attribute or Measurement above it, and the pick stays for the next one. A Show filter shows both kinds or just one, and once five or more are parked a search finds an item by its text or by where it came from. Each item's chips move it to the other section if it was parked as the wrong kind. The full Parked list on the Steps rail shows Measurement as a kind beside the others, and the Excel, Turtle and RDF exports carry it.

## Key Benefits

- **Park it where it belongs**: a measurement no longer pretends to be a detailed attribute
- **Straight from the story**: one click on a selected word parks it as either kind
- **Find it again**: a Show filter and a search narrow the Parked Details page
- **Fix a wrong guess**: a chip moves an item to the other kind

Parked measurements are available now in the Concept Model app in the Context Plane monorepo, and they reach the public app at [github.com/AgileDataGuides/concept-model](https://github.com/AgileDataGuides/concept-model) and its [live demo](https://agiledataguides.github.io/concept-model/) on its next publish.
