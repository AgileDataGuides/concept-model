# The Concept Model's SaaS Example Now Holds Only Concepts

**19 October 2026**

AgileDataGuides today released a revised SaaS example for the Concept Model app, so every Concept on its Map is a Concept in the Blue Book's sense, and a reader learning the method is not misled by a metric.

## The Problem

The Concept Model app is the companion to the Blue Book, an Agile Data Guide to Modeling Business Concepts. Its SaaS example held Recurring Revenue and One-Time Revenue as Concepts. Recurring Revenue is a metric: it is the count, not a thing the business counts. The example even carried a special case asking whether it was countable. One-Time Revenue was an amount of the same kind. A reader who copied the example would put their own metrics on their own Concept Map, which is the mistake the book warns against.

## The Solution

The SaaS example now holds 15 Concepts and 16 Relationships. Recurring Revenue is gone from the Map. It sits in the Parked list, with a note to define it, with MRR and ARR, in the Business Glossary. That is what a Facilitator does when a metric comes up in a session. One-Time Revenue is now One-Time Charge: the setup fee, paid service or prorated upgrade on an Invoice. That is a thing the business can count. The example of a Definition in Disagreement moves to Customer: RevOps counts a Customer from the day a paid Subscription starts, and Finance only once their first Invoice is paid. The scope statement now names the invoices and payments that MRR, ARR and churn are counted from.

## How It Works

The app also guards its own door. The Context Plane can flag a Concept as a Metric, and the app leaves every Metric out of a file it opens, along with the Relationships, Event links and Map positions that pointed at it. The app never shows the flag. It shows Concepts only. The live demo picks up the new example on a visitor's next visit, and keeps any Model the visitor made.

## Key Benefits

- **The example teaches the method**: every Concept on the SaaS Map passes the Blue Book's test
- **The call is shown, not just made**: Recurring Revenue sits in the Parked list, sent to the Glossary, as a Facilitator would do it
- **One story still**: the example still tells the lead to revenue story the other SaaS examples tell
- **No metrics slip in**: a file from the Context Plane arrives with Concepts only

The revised SaaS example is available now in the Concept Model app in the Context Plane monorepo, and it reaches the public app at [github.com/AgileDataGuides/concept-model](https://github.com/AgileDataGuides/concept-model) and its [live demo](https://agiledataguides.github.io/concept-model/) on its next publish.
