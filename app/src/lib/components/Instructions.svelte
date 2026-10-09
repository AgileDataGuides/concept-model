<script lang="ts">
	// The Instructions tab (standalone only), in the same shape as the BEM and
	// IPC apps. The step list comes from the canon file, so a change to the
	// book's wording reaches this page too.
	import { CORE_BUSINESS_EVENTS, STEPS, stepLabel } from '$lib/canon/steps';
	import type { StepId } from '$lib/types';

	const PROMPTS: Record<StepId, string> = {
		scope: 'Is this Scope an ocean or a puddle? Suggest a tighter boundary.',
		'subject-matter-expert': 'Who else should we talk to for this slice of the organisation?',
		stories: 'Read these stories. Which variations are missing?',
		concepts: 'Which nouns in the stories are Concepts, and which are information about a Concept?',
		definitions: 'Check each Definition for tautologies and for system words like table, flag or status code.',
		relationships: 'Which Concepts have no Relationship yet? What verbs connect them in real life?',
		'relationship-rules': 'Read each Relationship Rule aloud. Which ones look wrong for this organisation?',
		map: 'Which Concepts start the story, and which depend on others? Suggest how to arrange the Map.',
		questions: 'Suggest three to five Business Questions this Map should help answer.',
		walk: 'Walk each story across the Map. Where does it get stuck?'
	};
	const EVENTS_PROMPT = 'Which Core Business Events are missing, and which have nothing attached?';
</script>

<div class="instructions">
	<h2>Concept Model</h2>
	<p>
		The companion app for the Blue Book, an Agile Data Guide to Modeling Business Concepts. Capture a Concept Model with a
		Subject Matter Expert, ten steps at a time, list its Core Business Events, then read it as a Concept Map, as Definitions and as a Business Event Matrix.
	</p>

	<div class="options">
		<section class="option-card">
			<h3>Quick Start: Explore the Example</h3>
			<p>The app opens on the <strong>Blue Book Retail Concept Model</strong>, which takes every step: the worked example from the Blue Book, a retailer modeled from order to delivery, with the thirteen Concepts and five Core Business Events the book draws. The <strong>SaaS Revenue Concept Model</strong> sits beside it in the model switcher.</p>
			<ol>
				<li>The <strong>Steps</strong> tab lists the ten steps down the left. Each row says how far that step has got. Click any row to open it.</li>
				<li>The address bar always names the tab and step you are on, for example <code>?tab=steps&amp;step=concepts</code>. Copy it to send someone a link that opens the same tab and step. The link names a place, not a Model: they see that tab and step in whichever Model they have open, so tell them which Model to pick in the switcher.</li>
				<li>The <strong>Concept Map</strong> tab shows the Concept Map the way the Blue Book draws it: Concepts as sticky notes, Domains as pinned sheets of paper, Core Business Events as diamonds, and the verbs on every line, each with its Relationship Rule under it: read from a Concept, the nearest verb and rule start the sentence, "Customer places one or many" Sales Orders. Drag a Domain by its name to move its whole sheet. The switches at the top of the Map turn its layers on and off: Domains, Concepts, Relationship Lines, Relationship Verbs, Relationship Rules and Events. Relationship Verbs shows the Step 6 verbs, and Relationship Rules shows the Step 7 rule words such as "one or many". Either can show without the other. Turn on only what a step adds to draw that step's picture, such as Domains and Concepts for Step 4. <strong>Export SVG</strong> saves the whole Map as one picture file, with the layers that are on.</li>
				<li>The <strong>Definitions</strong> tab reads the whole Model one thing at a time: each Concept's Definition, each Relationship as two sentences, each Event. The rail on the left lists them in the same order, like the Steps tab. Click a row to jump to it. As you scroll, the rail marks the one you are reading. Type in the search at the top of the rail to find a Concept by name, and press Enter to jump to the first match. A blue Concept name inside a Definition jumps to that Concept too. Click <strong>Details</strong> on a Concept or an Event to change it without leaving the tab.</li>
				<li>The <strong>Parked Details</strong> tab lists the detailed attributes parked so far, information about a Concept like Customer email, with where each came from. Type one in to park it. They wait for the DESIGN stage.</li>
				<li>The <strong>Core Business Events</strong> tab lists the moments that matter, each said as who-does-what, like "Customer places a Sales Order". For each Event, pick the Concepts it involves, the Relationship it sits on, and the Concept it is too, if it is one. A quiet hint names any Event with nothing attached. These were Step 8 in the book's canon. Here they have their own tab, beside the grid that shows them.</li>
				<li>The <strong>Business Event Matrix</strong> tab shows the same Model as a Business Event Matrix, with the features and the words of the Business Event Matrix app. Every change you make there changes the Model itself, so the Steps, the Map and the Definitions follow. Each row is a Core Business Event and each column a Concept, under a band for its Domain, or for its 7W with <strong>Group by 7W's</strong>. Click a cell to mark it: ✓ the Event involves the Concept, ✭ the Event is also that Concept (the "Is also the Concept" of the Core Business Events tab, one per Event), then clear. Add an Event, a Concept (with its Domain and its 7W: Who, What, When, Where, Why, How or How Many) or a Domain above the grid. Click any name to rename it, change its 7W or other details, or delete it. Drag ⠿ to reorder the Events, the Concepts within their Domain, or the Domains. Search the Events, Domains and Concepts, turn on <strong>Hide unmarked</strong> to drop the empty rows and columns, and click ◂ to fold a band away. <strong>Concepts</strong> counts the Concepts each Event marks, and turns amber for an Event with nothing attached. <strong>Event Count</strong> counts the Events that mark each Concept.</li>
			</ol>
		</section>

		<section class="option-card">
			<h3>Run a Session</h3>
			<p>
				Put the app on a shared screen, so the Subject Matter Expert watches their words become sticky notes. The Facilitator types,
				the expert rules on the words, the Data Team listens for what comes next, and the Stakeholders bring the Business
				Questions the Map has to answer.
			</p>
			<ol>
				{#each STEPS as step (step.id)}
					<li><strong>{stepLabel(step)}</strong>: {step.question}</li>
				{/each}
			</ol>
			<ul>
				<li><strong>The steps are a checklist, not a wizard.</strong> Loop freely. A story sparks a Concept, the Concept needs a Definition, the Definition surfaces a Relationship.</li>
				<li><strong>Type a name, press Enter, keep going.</strong> Every add field keeps the cursor, and nothing has to be complete before you Save.</li>
				<li><strong>Skip on purpose.</strong> A step can be marked skipped, with a note on why, so it is dropped knowingly rather than by accident.</li>
				<li><strong>Park what belongs elsewhere.</strong> Information about a Concept ("Customer name") is a detailed attribute. Park it in Step 4 and it waits for the DESIGN stage, listed in the Parked Details tab. Out of scope and future Map items go on the Parked list with them.</li>
				<li><strong>Quiet hints</strong> show the book's rules of thumb, like ten to twenty Concepts, when the Model drifts outside them. They never stop you.</li>
				<li><strong>A Definition has three parts</strong>, and Step 5, the Definitions tab and Details show them with the same words, in the same order. <strong>Part one</strong> says what must be true for something to be the Concept. Under it, the helper takes a broader category and what sets the Concept apart ("a Customer is an owner of a library card that can borrow books from our library"). While part one is empty, <strong>Use this sentence</strong> copies the helper's sentence into it. <strong>Part two</strong> holds a few real ones, by name. An example can appear twice: once in everyday words, and once as a fact, the way fact-based modelling writes it ("Fact: Customer 'Harbour Café' places Sales Order 'SO-1042'."). Both example Models do this. <strong>Part three</strong> holds the special cases: what counts, and what does not.</li>
				<li><strong>Concepts named in a Definition are links.</strong> On the Definitions tab, click one to jump to its own Definition. In Step 5, the <strong>Refers to</strong> line lists them, and a click opens that Concept.</li>
				<li><strong>Details</strong> on a Concept, Domain or Event opens the full editor: aliases, W's and notes. For a Concept it also holds all three parts of its Definition and its status, its Domain and the stories it came from. It is the same popup on every tab, the Business Event Matrix included.</li>
			</ul>
		</section>

		<section class="option-card">
			<h3>Works With Claude</h3>
			<p>Save the model, then open <strong>Claude Code</strong> in this project. It reads the JSON in <code>data/</code>. One question per step:</p>
			<ul class="examples">
				{#each STEPS as step (step.id)}
					<li>{stepLabel(step)}: "{PROMPTS[step.id]}"</li>
				{/each}
				<li>{CORE_BUSINESS_EVENTS.name}: "{EVENTS_PROMPT}"</li>
			</ul>
		</section>

		<section class="option-card chat-card">
			<h3>No Claude Code? Use Claude Chat Instead</h3>
			<p>Export your model as JSON and upload it to <a href="https://claude.ai" target="_blank" rel="noopener">claude.ai</a>.</p>
			<ol>
				<li>Click <strong>Export JSON</strong> to download the model.</li>
				<li>Open <a href="https://claude.ai" target="_blank" rel="noopener">claude.ai</a> and start a new conversation.</li>
				<li>Attach the JSON file and ask any of the questions above.</li>
			</ol>
		</section>

		<section class="option-card">
			<h3>Managing Models</h3>
			<h4>Switching Models</h4>
			<ul>
				<li>Click the model name in the dark header to switch. Unsaved changes are saved first, and if that save fails you stay on the current model.</li>
				<li><strong>New Model</strong> creates a blank model alongside the others.</li>
				<li><strong>Import</strong> loads a JSON file as a NEW model, never over the current one. Files from before the steps (version 1.0) load too: a cardinality like <code>1 : 1..*</code> becomes a Relationship Rule, and anything that cannot be read without guessing shows in Step 7 as "To restate".</li>
				<li><strong>Import</strong> also reads Turtle (<code>.ttl</code>) and RDF/XML (<code>.rdf</code>, <code>.owl</code>). A file this app exported comes back whole. An ontology from another tool, such as Protégé, or a SKOS vocabulary becomes a new model: each class or SKOS concept is a Concept, each object property between two of them is a Relationship with its rule read from the cardinality restrictions, and each SKOS collection is a Domain. Protégé can also save a <code>.owl</code> file as OWL/XML. This app does not read OWL/XML, so save the file as RDF/XML or Turtle first.</li>
				<li><strong>Delete</strong> (red, in the dark header) removes the current model.</li>
			</ul>
			<h4>Saving and Exporting</h4>
			<ul>
				<li><strong>Save</strong> writes the model as JSON to <code>data/</code>. The button says <em>Saved</em> when nothing has changed.</li>
				<li><strong>Export JSON</strong> downloads the whole model, every step included, to share or import again.</li>
				<li><strong>Export CSV</strong> downloads the Concepts with their Definitions.</li>
				<li><strong>Export Excel</strong> downloads a workbook: Concepts, Relationships with their rules in words, Events, the Business Event Matrix grid, Domains, the Scope and the people, stories, Business Questions, walks and the parked list.</li>
				<li><strong>Export SVG</strong> downloads the whole Concept Map as one picture file, from any tab: every note, sheet, curve, verb and diamond in the layers the Map shows, on a white page, with none of the Map's buttons. A layer that is off is not in the file, and the page stays the same size whichever layers are on, so the pictures for each step line up. It is sharp at any size, and it carries the handwritten font inside, so the handwriting looks the same in any browser, even on a computer without the font. Open it in a browser, or put it in a slide or a document. Some slide and drawing tools ignore the font inside the file and use one of their own.</li>
				<li><strong>Export Turtle</strong> and <strong>Export RDF</strong> download the whole model for ontology and knowledge graph tools, as Turtle (<code>.ttl</code>) or RDF/XML (<code>.rdf</code>, the format Protégé opens). Each Concept is an OWL class and a SKOS concept with its Definition, examples and special cases. Each Relationship is an OWL property in both directions, and its Relationship Rule becomes OWL cardinality restrictions. Everything else, from the stories to the Map positions, rides along in the file, so importing it gives the same model back. The model's own terms sit under <code>urn:concept-model:</code> and its name. Replace that with your own namespace before you publish the file.</li>
			</ul>
		</section>

		<section class="option-card security-card">
			<h3>Security Notice</h3>
			<p><strong>This app is designed to run locally on your own machine.</strong> Do not expose it to the internet or deploy it on a public server. The Save feature writes files directly to your filesystem. There is no user authentication, so anyone who can reach the server can read and overwrite your data.</p>
			<p>A model can name the people in a session. Use role titles if the file will be shared.</p>
		</section>

		<section class="option-card data-storage-card">
			<h3>Data Storage</h3>
			<p><strong>Save</strong> writes files to the <code>data/</code> folder as JSON. This only works in dev mode (<code>npm run dev</code>) where the server can write to disk. Claude can then read these files directly.</p>
			<p>In the live demo, Save writes to your browser's local storage instead. Nothing is sent to a server.</p>
		</section>
	</div>

	<section class="footer-section">
		<p>
			Code: <strong>MIT</strong> · Docs: <strong>CC BY-SA 4.0</strong> by AgileDataGuides. The step names, questions and
			descriptions come from the Blue Book by Juha Korpela and Shane Gibson.
		</p>
	</section>
</div>

<style>
	.instructions {
		max-width: 900px;
		line-height: 1.6;
	}

	h2 {
		font-size: 1.25rem;
		margin-bottom: 0.25rem;
	}

	.instructions > p {
		font-size: 0.875rem;
		color: var(--color-text-muted, #64748b);
		margin-bottom: 1.25rem;
	}

	.options {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.option-card {
		padding: 1rem 1.25rem;
		background: var(--color-surface, #ffffff);
		border-radius: 8px;
		border: 1px solid var(--color-border, #e2e8f0);
	}

	.option-card h3 {
		font-size: 1rem;
		margin: 0 0 0.375rem 0;
		padding: 0;
		border: none;
	}

	.option-card > p {
		font-size: 0.8125rem;
		color: var(--color-text-muted, #64748b);
		margin-bottom: 0.625rem;
	}

	.chat-card {
		background: #f8f6ff;
		border-color: #d4c8f0;
	}

	.chat-card a {
		color: var(--color-primary, #2563eb);
		text-decoration: underline;
	}

	.security-card {
		background: #fff8f0;
		border-color: #e8c090;
	}

	.data-storage-card {
		background: #f5f5f5;
		border-color: #ddd;
	}

	h4 {
		font-size: 0.875rem;
		margin-top: 0.875rem;
		margin-bottom: 0.375rem;
	}

	ol,
	ul {
		font-size: 0.8125rem;
		margin: 0 0 0.5rem 0;
		padding-left: 1.25rem;
	}

	ol {
		list-style: decimal;
	}

	ul {
		list-style: disc;
	}

	li {
		margin-bottom: 0.25rem;
	}

	.examples {
		list-style: none;
		padding-left: 0.5rem;
		margin-top: 0.375rem;
	}

	.examples li {
		font-size: 0.8125rem;
		color: var(--color-text-muted, #64748b);
	}

	.examples li::before {
		content: '\203A  ';
		color: var(--color-primary, #2563eb);
		font-weight: 600;
	}

	code {
		background: white;
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		font-size: 0.8125rem;
		border: 1px solid var(--color-border, #e2e8f0);
	}

	.footer-section {
		margin-top: 1.25rem;
	}

	.footer-section p {
		font-size: 0.75rem;
		color: var(--color-text-muted, #64748b);
	}
</style>
