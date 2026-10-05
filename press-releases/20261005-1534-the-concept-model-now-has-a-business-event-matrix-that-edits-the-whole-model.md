# The Concept Model Now Has a Business Event Matrix That Edits the Whole Model

**5 October 2026**

AgileDataGuides today released the Event Matrix tab in the Concept Model app, a full Business Event Matrix over the Model's own Core Business Events and Concepts, so a modeling team can build and change the Model from one grid and see every other view follow.

## The Problem

Step 8 of the Blue Book surfaces the Core Business Events and the Concepts each one involves. The app captured them one Event at a time, as chips under each Event in Step 8, and the Map drew them as dashed lines to the diamonds. Neither view answered the questions a data team asks next. Which Concepts does no Event involve? Which Concepts do most Events share? Which Domains does an Event cross? Teams who think in the Business Event Matrix had to retype the Events and Concepts into the Business Event Matrix app to work on them as a grid, then keep two copies in step by hand, and every change made in the grid had to be made again in the Concept Model.

## The Solution

A new Event Matrix tab, after Definitions, is the Business Event Matrix app's grid working directly on the Concept Model. Each row is a Core Business Event. Each column is a Concept, under a band for its Domain, or for its 7W (Who, What, When, Where, Why, How, How Many) at the click of Group by 7W's. A Concept gets its 7W as it is added in the grid, or in its Details, and every Concept in the SaaS example already has one, so the 7W view is full from the first click. A click on a cell cycles the Business Event Matrix app's marks: ✓ when the Event involves the Concept, ✭ when the Event is also that Concept, then clear. Events, Concepts and Domains can be added above the grid, renamed or deleted with one click on their name, and dragged into a new order. The same click opens the Details popup every tab uses, which holds a Concept's Domain and the stories it came from as Step 4 does, so a Concept can move to another Domain from the grid. Every one of these changes is a change to the Model itself, so Step 8, Step 4, Step 1, the Map and the Definitions show it straight away.

## How It Works

The grid writes through the same paths the Steps use. A ✓ is the Concept listed under Involves in Step 8. A ✭ is Step 8's "Is also the Concept", one per Event, so marking a second Concept with ✭ moves it there, and the first keeps its ✓ when the Event involves it: the Event "Customer places a Sales Order" is also the Concept Sales Order. Dragging an Event row sets the order Step 8 shows, dragging a Concept within its Domain sets the order Step 4 shows, and dragging a Domain band sets the order Step 1 shows. The Business Event Matrix app's view tools come too: a search field each for Events, Domains and Concepts, Hide unmarked to drop the rows and columns with no marks, a ◂ to fold a band away, and a card with each Concept's Definition when the pointer rests on its column. A Concepts count on each row turns amber for an Event with nothing attached, and an Event Count row shows the Concepts no Event involves. Export Excel now adds the grid as an Event Matrix sheet, and CSV and Excel carry each Concept's 7W. The Business Event Matrix app also marks Events against Domains directly, and a Concept Model places Concepts in Domains instead, so the Domains appear as the bands over their Concepts.

## Key Benefits

- **Build the Model from the grid**: add Events, Concepts and Domains, mark what each Event involves, and reorder, all in one place
- **Every view follows**: each change in the grid is a change to the Model, so the Steps, the Map and the Definitions never fall behind
- **Gaps stand out**: an Event that involves no Concept turns amber, and a Concept no Event involves has an empty count
- **The Business Event Matrix you know**: the same marks, searches, Hide unmarked, folding bands and 7W bands as the Business Event Matrix app
- **No second copy**: nothing is retyped into another app, and nothing has to be kept in step by hand

The Event Matrix tab is available now in the Concept Model app in the Context Plane monorepo, and it reaches the public app at [github.com/AgileDataGuides/concept-model](https://github.com/AgileDataGuides/concept-model) and its [live demo](https://agiledataguides.github.io/concept-model/) on its next publish.
