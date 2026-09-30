# Relationship Rules Now Read as Plain Sentences

**30 September 2026**

AgileDataGuides today released Relationship Rules in words for the Concept Model app, so every Relationship reads aloud in both directions, "Each Customer places one or many Sales Orders" and "Each Sales Order is placed by one Customer", and an expert can confirm it without any training.

## The Problem

How many of one thing relate to another, and whether there can be none, carries a surprising amount of business logic. The app kept it as one free-text cardinality field, so teams typed notation like "1 : 1..*" or "1:M". A Subject Matter Expert cannot confirm a crow's foot or a "0..*". Worse, the notation hid the question that matters most, whether zero is allowed, which is where a prospect gets counted as a customer by mistake. And a Relationship could only be read one way, even though the book reads every one in both directions.

## The Solution

Step 6 - Identify the Relationships now takes a verb both ways: "places" and "is placed by". Step 7 - Describe the Relationship Rules sets each direction with one click, zero or one, one, zero or many, or one or many, and writes out both sentences as you choose. An exotic rule the expert mentions can be flagged and left for later. The Definitions tab and the Map read the rules back in the same sentences.

## How It Works

Each Relationship keeps a rule for each direction: the minimum, zero or one, and the maximum, one or many. The app builds the sentence from the verb, the rule and the other Concept, plural when the maximum is many. Models saved before this change move over by themselves: a cardinality written as UML ends, like "1 : 1..*", becomes a rule. Anything that cannot be read without guessing, like "1:M", which says nothing about zero, stays as text and shows in Step 7 as "To restate".

## Key Benefits

- **Rules an expert can confirm**: plain sentences instead of notation
- **Both directions, every time**: each Relationship reads forwards and backwards
- **Zero is always asked**: the minimum is part of every rule, so hidden optionality comes out in the room
- **Old models carried over honestly**: clear notation converts, and anything unclear is marked to restate, never guessed

Relationship Rules in words are available now in the Concept Model app at [github.com/AgileDataGuides/concept-model](https://github.com/AgileDataGuides/concept-model) and in the [live demo](https://agiledataguides.github.io/concept-model/).
