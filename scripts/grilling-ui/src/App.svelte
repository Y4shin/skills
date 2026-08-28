<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { graphModel, type GraphModel } from "./graph.js";

  // Polling state
  let state: any = null;
  let model: GraphModel = { rows: [], upcoming: [], edges: [] };
  let loading = true;
  let error: string | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  // Form state
  let answers: Record<string, string> = {};
  let feedback = "";

  async function fetchState() {
    try {
      const res = await fetch("/state");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state = await res.json();
      model = graphModel(state);
      // Initialize answer inputs from existing answers.
      if (state.answers) {
        answers = { ...state.answers };
      }
      // Only show answer inputs for current-round questions when in-round.
      if (state["page-state"] === "in-round") {
        const currentRound = activeRound(model);
        for (const row of model.rows) {
          if (row.round === currentRound) {
            for (const node of row.nodes) {
              if (!(node.id in answers)) {
                answers[node.id] = "";
              }
            }
          }
        }
      }
      error = null;
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  async function submitAnswers() {
    try {
      const res = await fetch("/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, feedback }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchState();
    } catch (e) {
      error = (e as Error).message;
    }
  }

  onMount(() => {
    fetchState();
    pollTimer = setInterval(fetchState, 2000);
  });

  onDestroy(() => {
    if (pollTimer) clearInterval(pollTimer);
  });

  // activeRound — the lowest round that still has unanswered questions (the
  // active frontier round). Falls back to the last round when every question is
  // answered (so final-review/round-done still highlight something sensible).
  function activeRound(model: GraphModel): number {
    if (model.rows.length === 0) return 0;
    for (const row of model.rows) {
      if (row.nodes.some((n) => !n.answered)) return row.round;
    }
    return model.rows[model.rows.length - 1].round;
  }

  // Edge style helper
  function edgeStyle(type: string): string {
    switch (type) {
      case "dep": return "stroke: black; stroke-width: 2px;";
      case "contra": return "stroke: red; stroke-width: 2px;";
      case "ref": return "stroke: gray; stroke-width: 1px; stroke-dasharray: 4 4;";
      default: return "stroke: black; stroke-width: 1px;";
    }
  }

  function edgeLabel(type: string): string {
    switch (type) {
      case "dep": return "dependency";
      case "contra": return "contradiction";
      case "ref": return "reference";
      default: return type;
    }
  }

  // Current round = the lowest round that still has unanswered questions (the
  // active frontier round). Falls back to the last round when all are answered.
  // The previous logic used rows[length-1] — the highest round — which made only
  // the LAST round editable and left the real current round read-only.
  $: currentRound = activeRound(model);
  $: isInProgress = state?.["page-state"] === "in-round";
</script>

<div class="container">
  <header>
    <h1>Grilling Visualizer</h1>
    {#if state}
      <span class="page-state">State: {state["page-state"]}</span>
    {/if}
  </header>

  {#if loading}
    <p>Loading...</p>
  {:else if error}
    <p class="error">Error: {error}</p>
  {:else}
    <!-- Summary sidebar -->
    <aside class="summary">
      <h2>Summary</h2>
      <textarea
        bind:value={feedback}
        placeholder="Free-form summary / feedback..."
        rows="6"
        disabled={!isInProgress}
      ></textarea>
      {#if state?.summary}
        <div class="summary-text">{state.summary}</div>
      {/if}
    </aside>

    <!-- Graph -->
    <main class="graph">
      <!-- Legend -->
      <div class="legend">
        <span class="legend-item"><svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" style="stroke: black; stroke-width: 2px;"/></svg> dependency</span>
        <span class="legend-item"><svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" style="stroke: red; stroke-width: 2px;"/></svg> contradiction</span>
        <span class="legend-item"><svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" style="stroke: gray; stroke-width: 1px; stroke-dasharray: 4 4;"/></svg> reference</span>
      </div>

      <!-- Rounds as rows -->
      {#each model.rows as row}
        <div class="round-row">
          <h3>Round {row.round}</h3>
          <div class="nodes">
            {#each row.nodes as node}
              <div class="node" class:answered={node.answered} class:current={isInProgress && row.round === currentRound}>
                <span class="node-id">{node.id}</span>
                <span class="node-title">{node.title}</span>
                {#if node.answered}
                  <span class="badge answered-badge">answered</span>
                {/if}
                {#if isInProgress && row.round === currentRound && !node.answered}
                  <input
                    type="text"
                    placeholder="answer..."
                    bind:value={answers[node.id]}
                  />
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}

      <!-- Edges list -->
      {#if model.edges.length > 0}
        <div class="edges">
          <h3>Edges</h3>
          <ul>
            {#each model.edges as edge}
              <li>
                <span class="edge-from">{edge.from}</span>
                <svg width="30" height="10"><line x1="0" y1="5" x2="30" y2="5" style={edgeStyle(edge.type)}/></svg>
                <span class="edge-to">{edge.to}</span>
                <span class="edge-type">({edgeLabel(edge.type)})</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Upcoming section -->
      {#if model.upcoming.length > 0}
        <div class="upcoming">
          <h3>Upcoming (blocked)</h3>
          <ul>
            {#each model.upcoming as item}
              <li>
                <span class="node-id">{item.node.id}</span>
                <span class="blocked-by">blocked by: {item.blockedBy.join(", ")}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Submit button -->
      {#if isInProgress}
        <div class="submit-section">
          <button on:click={submitAnswers}>Send all answers</button>
        </div>
      {/if}
    </main>
  {/if}
</div>

<style>
  .container {
    display: flex;
    gap: 1rem;
    font-family: sans-serif;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
  }
  header {
    grid-column: 1 / -1;
  }
  .page-state {
    font-weight: bold;
    color: #555;
  }
  .summary {
    flex: 0 0 300px;
    border-right: 1px solid #ccc;
    padding-right: 1rem;
  }
  .summary textarea {
    width: 100%;
    box-sizing: border-box;
  }
  .summary-text {
    margin-top: 0.5rem;
    font-style: italic;
    color: #333;
  }
  .graph {
    flex: 1;
  }
  .legend {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    font-size: 0.85em;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .round-row {
    margin-bottom: 1.5rem;
    border: 1px solid #eee;
    padding: 0.5rem;
    border-radius: 4px;
  }
  .nodes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .node {
    border: 1px solid #ccc;
    padding: 0.5rem;
    border-radius: 4px;
    min-width: 120px;
  }
  .node.answered {
    background: #e8f5e9;
  }
  .node.current {
    border-color: #2196f3;
  }
  .node-id {
    display: block;
    font-family: monospace;
    font-size: 0.85em;
    color: #555;
  }
  .node-title {
    font-weight: bold;
  }
  .badge {
    font-size: 0.75em;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
  }
  .answered-badge {
    background: #4caf50;
    color: white;
  }
  .node input {
    margin-top: 0.25rem;
    width: 100%;
    box-sizing: border-box;
  }
  .edges ul, .upcoming ul {
    list-style: none;
    padding: 0;
  }
  .edges li, .upcoming li {
    margin: 0.25rem 0;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .edge-type, .blocked-by {
    font-size: 0.85em;
    color: #666;
  }
  .submit-section {
    margin-top: 1rem;
  }
  .submit-section button {
    padding: 0.5rem 1rem;
    font-size: 1em;
    cursor: pointer;
  }
  .error {
    color: red;
  }
</style>
