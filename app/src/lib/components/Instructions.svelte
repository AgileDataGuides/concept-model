<script lang="ts">
	// The Instructions tab (standalone only), in the same shape as the BEM and
	// IPC apps. The step list comes from the canon file, so a change to the
	// book's wording reaches this page too.
	import { STEPS, stepLabel } from '$lib/canon/steps';

	const PROMPTS: Record<string, string> = {
		scope: 'Is this Scope an ocean or a puddle? Suggest a tighter boundary.',
		'subject-matter-expert': 'Who else should we talk to for this slice of the organisation?',
		stories: 'Read these stories. Which variations are missing?',
		concepts: 'Which nouns in the stories are Concepts, and which are information about a Concept?',
		definitions: 'Check each Definition for tautologies and for system words like table, flag or status code.',
		relationships: 'Which Concepts have no Relationship yet? What verbs join them in real life?',
		'relationship-rules': 'Read each Relationship Rule aloud. Which ones look wrong for this organisation?',
		events: 'Which Core Business Events are missing, and which have nothing attached?',
		map: 'Which Concepts start the story, and which depend on others? Suggest how to arrange the Map.',
		questions: 'Suggest three to five Business Questions this Map should help answer.',
		walk: 'Walk each story across the Map. Where does it get stuck?'
	};
</script>

<div class="instructions">
	<h2>Concept Model</h2>
	<p>
		The companion app for the Blue Book, an Agile Data Guide to Modeling Business Concepts. Capture a Concept Model with a
		Subject Matter Expert, eleven steps at a time, then read it as a Concept Map and as Definitions.
	</p>

	<div class="options">
		<section class="option-card">
			<h3>Quick Start: Explore the Example</h3>
			<p>The app opens on the <strong>SaaS Revenue Concept Model</strong>, which takes every step.</p>
			<ol>
				<li>The <strong>Steps</strong> tab lists the eleven steps down the left. Each row says how far that step has got. Click any row to open it.</li>
				<li>The <strong>Map</strong> tab shows the Concept Map the way the Blue Book draws it: Concepts as sticky notes, Domains as pinned sheets of paper, Core Business Events as diamonds, and the verbs on every line: read from a Concept, the nearest verb starts the sentence. Drag a Domain by its name to move its whole sheet.</li>
				<li>The <strong>Definitions</strong> tab reads the whole Model one thing at a time: each Concept's Definition, each Relationship as two sentences, each Event.</li>
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
				<li><strong>Park what belongs elsewhere.</strong> Information about a Concept ("Customer name") waits for the DESIGN stage. Out of scope and future Map items go on the same list.</li>
				<li><strong>Quiet hints</strong> show the book's rules of thumb, like ten to twenty Concepts, when the Model drifts outside them. They never stop you.</li>
				<li><strong>Details</strong> on a Concept, Domain or Event opens the full editor: aliases, the Aristotelian helper for the Definition, W's and notes.</li>
			</ul>
		</section>

		<section class="option-card">
			<h3>Works With Claude</h3>
			<p>Save the model, then open <strong>Claude Code</strong> in this project. It reads the JSON in <code>data/</code>. One question per step:</p>
			<ul class="examples">
				{#each STEPS as step (step.id)}
					<li>{stepLabel(step)}: "{PROMPTS[step.id]}"</li>
				{/each}
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
				<li><strong>Import</strong> loads a JSON file as a NEW model, never over the current one. Files from before the eleven steps (version 1.0) load too: a cardinality like <code>1 : 1..*</code> becomes a Relationship Rule, and anything that cannot be read without guessing shows in Step 7 as "To restate".</li>
				<li><strong>Delete</strong> (red, in the dark header) removes the current model.</li>
			</ul>
			<h4>Saving and Exporting</h4>
			<ul>
				<li><strong>Save</strong> writes the model as JSON to <code>data/</code>. The button says <em>Saved</em> when nothing has changed.</li>
				<li><strong>Export JSON</strong> downloads the whole model, every step included, to share or import again.</li>
				<li><strong>Export CSV</strong> downloads the Concepts with their Definitions.</li>
				<li><strong>Export Excel</strong> downloads a workbook: Concepts, Relationships with their rules in words, Events, Domains, the Scope and the people, stories, Business Questions, walks and the parked list.</li>
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
