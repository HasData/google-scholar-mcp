// Tool contract test.
//
// The README promises two tools with specific names and required parameters. The upstream list
// can change without a single commit here, and the README would start lying silently. These
// checks catch that before a user does.
//
// Two tests call the API for real. Listing tools accepts any non-empty key, so a contract check
// that only lists tools stays green with a revoked or mistyped key, and it would also stay green
// if the parser dropped the ids the two tools use to compose. The live search is shared between
// the checks that need it, and the citation call runs the two-call workflow the README
// documents. Together they cost 20 credits a run, which is the price of a canary that can fail
// for the right reason.
//
// Run: HASDATA_API_KEY=your_key_here npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';

const ENDPOINT = 'https://mcp.hasdata.com/api/mcp?apis=google_scholar';
const KEY = process.env.HASDATA_API_KEY;
const TIMEOUT_MS = 30_000;

const SEARCH = 'hasdata_google_scholar_scholar_getScholarSearchResults';
const CITE = 'hasdata_google_scholar_cite_getScholarCitationFormats';

const EXPECTED = {
    [SEARCH]: ['q'],
    [CITE]: ['q'],
};

// Search parameters the README documents by name.
const SEARCH_PARAMS = ['asYlo', 'asYhi', 'start', 'num', 'scisbd', 'cites', 'cluster', 'asSdt', 'asRr', 'asVis', 'hl', 'lr', 'safe', 'filter'];

// Citation styles the README lists.
const STYLES = ['MLA', 'APA', 'Chicago', 'Harvard', 'Vancouver'];

// A streamable HTTP body arrives either as plain JSON or as server-sent events. One SSE event
// can span several data: lines, several events can share one response, and a server is free to
// send progress notifications before the answer. So collect every event and pick the message
// carrying our request id instead of trusting the first data: line.
function parseRpc(raw, id) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);

    const messages = [];
    for (const event of trimmed.split(/\r?\n\r?\n+/)) {
        const data = event
            .split(/\r?\n/)
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice(5).replace(/^ /, ''))
            .join('\n');
        if (!data || data === '[DONE]') continue;
        try {
            messages.push(JSON.parse(data));
        } catch {
            // A keep-alive or a partial event is not our response.
        }
    }
    assert.ok(messages.length, `no JSON-RPC message in the response: ${raw.slice(0, 300)}`);
    const match = messages.find((m) => m.id === id);
    assert.ok(match, `no message with id ${id} in the response: ${raw.slice(0, 300)}`);
    return match;
}

let nextId = 1;

async function rpc(method, params = {}) {
    // The CI key sits on the free plan, where concurrency is 1. When several of
    // these repos are pushed at once their contract runs collide, and HasData
    // answers 429 with code concurrency_limit straight away rather than queueing.
    // That is a plan limit, not a broken contract, so the call is retried before
    // the test gives up. A 401 still fails on the first attempt.
    for (let attempt = 1; ; attempt++) {
        const id = nextId++;
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'x-api-key': KEY,
                'Content-Type': 'application/json',
                // The server answers over streamable HTTP, so accept both a plain body and a stream.
                Accept: 'application/json, text/event-stream',
            },
            body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        assert.equal(res.status, 200, `${method} returned ${res.status}`);
        const raw = await res.text();
        if (raw.includes('concurrency_limit') && attempt < 5) {
            await new Promise((r) => setTimeout(r, attempt * 4000));
            continue;
        }
        return { raw, body: parseRpc(raw, id) };
    }
}

function payloadOf(body) {
    const text = body.result?.content?.[0]?.text ?? '';
    return { text, json: JSON.parse(text).json };
}

// One network round trip for every test that needs the list.
let toolsPromise;
function listTools() {
    toolsPromise ??= rpc('tools/list').then(({ body }) => {
        assert.ok(body.result?.tools, 'the response carried no result.tools');
        return body.result.tools;
    });
    return toolsPromise;
}

// One paid round trip, shared by the checks that need a real answer.
let searchPromise;
function liveSearch() {
    searchPromise ??= rpc('tools/call', {
        name: SEARCH,
        arguments: { q: 'transformer architecture', num: 5 },
    });
    return searchPromise;
}

const live = { skip: KEY ? false : 'HASDATA_API_KEY is not set, skipping the live checks' };

test('apis=google_scholar exposes the documented tools and nothing else', live, async () => {
    const tools = await listTools();
    const names = tools.map((t) => t.name).sort().join(', ');
    assert.equal(
        tools.length,
        Object.keys(EXPECTED).length,
        `expected ${Object.keys(EXPECTED).length} tools, got ${tools.length}: ${names}`
    );
});

test('the tool names have not changed', live, async () => {
    const tools = await listTools();
    const names = new Set(tools.map((t) => t.name));
    for (const expected of Object.keys(EXPECTED)) {
        assert.ok(names.has(expected), `tool ${expected} is missing from the list`);
    }
});

test('both tools still require q and carry a description', live, async () => {
    const tools = await listTools();
    for (const tool of tools) {
        const required = tool.inputSchema?.required ?? [];
        const want = EXPECTED[tool.name];
        assert.ok(want, `tool ${tool.name} is not covered by this test`);
        for (const param of want) {
            assert.ok(
                required.includes(param),
                `${tool.name} should require ${param}, declares: ${required.join(', ') || 'nothing'}`
            );
        }
        assert.ok(
            (tool.description || '').trim().length > 20,
            `${tool.name} has an empty or near-empty description`
        );
    }
});

test('the search parameters the README documents are still in the schema', live, async () => {
    const tools = await listTools();
    const search = tools.find((t) => t.name === SEARCH);
    assert.ok(search, 'the search tool is missing from the list');
    const props = search.inputSchema?.properties ?? {};
    for (const param of SEARCH_PARAMS) {
        assert.ok(props[param], `the search tool no longer accepts ${param}`);
    }
});

// resultId, citesId and clusterId are what let the two tools compose and what the citation
// graph walk depends on. A parser change that dropped them would leave a green tools list.
test('a live search still returns the ids the tools compose on', live, async () => {
    const { body } = await liveSearch();
    const { text, json } = payloadOf(body);
    const results = json?.organicResults;

    assert.ok(Array.isArray(results), `no organicResults array in the response: ${text.slice(0, 300)}`);
    assert.ok(results.length, 'organicResults came back empty, so the page was not parsed');

    for (const r of results) {
        const shown = JSON.stringify(r).slice(0, 160);
        assert.ok(r.resultId, `a result carried no resultId: ${shown}`);
        assert.ok(r.title, `a result carried no title: ${shown}`);
    }

    assert.ok(
        results.some((r) => r.citedBy?.citesId),
        'not one result carried citedBy.citesId, so the cites lookup the README documents cannot be built'
    );
    assert.ok(
        results.some((r) => r.versions?.clusterId),
        'not one result carried versions.clusterId, so the cluster lookup the README documents cannot be built'
    );
});

// The README tells readers to search first and feed resultId into the citation tool. That is a
// two-call workflow, so it is checked as one rather than assumed from the schema.
test('a resultId from search still resolves to the documented citation styles', live, async () => {
    const { body: searchBody } = await liveSearch();
    const { json } = payloadOf(searchBody);
    const resultId = json?.organicResults?.[0]?.resultId;
    assert.ok(resultId, 'the search returned no resultId to cite');

    const { raw, body } = await rpc('tools/call', { name: CITE, arguments: { q: resultId } });
    assert.ok(!raw.includes('401 Unauthorized'), 'HasData rejected the key');
    assert.ok(!raw.includes('"isError":true'), `the citation call failed: ${raw.slice(0, 300)}`);

    const { text, json: cite } = payloadOf(body);
    const citations = cite?.citations;
    assert.ok(Array.isArray(citations) && citations.length, `no citations array in the response: ${text.slice(0, 300)}`);

    const titles = citations.map((c) => c.title);
    for (const style of STYLES) {
        assert.ok(titles.includes(style), `citation style ${style} is gone, got: ${titles.join(', ')}`);
    }
    for (const c of citations) {
        assert.ok(c.snippet, `citation style ${c.title} came back with no formatted string`);
    }
});
