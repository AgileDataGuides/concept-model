# The Concept Model Now Opens in Ontology Tools, and Reads Their Files Back

**6 October 2026**

AgileDataGuides today released Turtle and RDF export and import in the Concept Model app, so a modelling team can hand its Concepts, Definitions and Relationship Rules to an ontology or knowledge graph tool, and start a Concept Model from an ontology that already exists.

## The Problem

A Concept Model is the business's own description of what it cares about: the Concepts, what each one means, how they relate, and the rule on each Relationship. The next people to use it are often building an ontology, a knowledge graph or a semantic layer, and their tools (Protégé, triple stores, SKOS vocabulary managers) speak RDF. The app exported JSON, CSV, Excel and a picture of the Map, and none of those open in an ontology tool. To move a model across, someone retyped every Concept as a class, every Definition as an annotation and every Relationship Rule as a cardinality restriction, by hand, and the copy drifted the first time the model changed. The other direction was worse: a team that already had an ontology or a controlled vocabulary started its Concept Model from a blank page.

## The Solution

Two new buttons, Export Turtle and Export RDF, save the whole Concept Model as Turtle (`.ttl`) or RDF/XML (`.rdf`, the format Protégé opens and saves). Each Concept becomes an OWL class and a SKOS concept that carries the three parts of its Definition. Each Relationship becomes an OWL property in both directions, labelled with its verbs, and each Relationship Rule becomes OWL cardinality restrictions, so "Each Customer places one or many Sales Orders" arrives as a rule an ontology tool can reason with. The Import button now reads both formats. A file the app exported comes back whole, with every step of the Blue Book. An ontology from Protégé or a SKOS vocabulary becomes a new Concept Model: its classes become Concepts, its properties become Relationships with their rules, and its collections become Domains.

## How It Works

The file uses the two standards ontology tools already know: OWL 2 for the classes, properties and rules, and SKOS for the labels, Definitions, examples and special cases. What neither standard has a word for, such as the Core Business Events, the stories, the walks and the positions on the Map, travels in a small Concept Model vocabulary, so nothing is lost on the way back. The model's own terms sit under a name made from the model, and one find-and-replace moves them to an organisation's own namespace before the file is published. A file with a mistake in it is refused with the line and column of the mistake, and a file with no classes in it says so.

## Key Benefits

- **Hand the model to the ontology team**: Concepts, Definitions, verbs and rules open in Protégé and load into a triple store without retyping
- **Start from what exists**: an existing ontology or SKOS vocabulary becomes a Concept Model in one import
- **Rules that tools can use**: each Relationship Rule is a real OWL cardinality restriction, not a note
- **Nothing lost on the round trip**: export a model, import the file, and every step comes back the same
- **The words people already use**: labels, Definitions, examples and aliases sit in standard SKOS terms that vocabulary tools read

Turtle and RDF export and import are available now in the Concept Model app in the Context Plane monorepo, and they reach the public app at [github.com/AgileDataGuides/concept-model](https://github.com/AgileDataGuides/concept-model) and its [live demo](https://agiledataguides.github.io/concept-model/) on its next publish.
