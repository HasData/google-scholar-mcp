# Google Scholar MCP Server

<!-- mcp-name: com.hasdata/google-scholar -->

A hosted Model Context Protocol (MCP) server that gives Claude, Cursor, Windsurf and any other MCP client two read-only Google Scholar tools. Search the literature with Scholar's own operators, year ranges and cited-by lookups, then pull a paper's citation in five styles with its BibTeX and EndNote export links, both as structured JSON, with nothing to host.

It reads public Google Scholar pages that a signed-out visitor can see.

**1,000 free credits every month, no card required**, which is 100 Scholar calls at the 10-credit rate.

```
https://mcp.hasdata.com/api/mcp?apis=google_scholar
```

[![Glama score](https://glama.ai/mcp/servers/HasData/google-scholar-mcp/badges/score.svg)](https://glama.ai/mcp/servers/HasData/google-scholar-mcp)
[![tool contract](https://github.com/HasData/google-scholar-mcp/actions/workflows/contract.yml/badge.svg)](https://github.com/HasData/google-scholar-mcp/actions/workflows/contract.yml)
[![MCP](https://img.shields.io/badge/MCP-remote%20%7C%20streamable%20HTTP-6366f1?style=flat-square)](https://mcp.hasdata.com/api/mcp?apis=google_scholar)
[![Tools](https://img.shields.io/badge/tools-2-10b981?style=flat-square)](#tools)
[![npm](https://img.shields.io/npm/v/@hasdata/google-scholar-mcp?style=flat-square&logo=npm&label=npm&color=cb3837)](https://www.npmjs.com/package/@hasdata/google-scholar-mcp)
[![PyPI](https://img.shields.io/pypi/v/hasdata-google-scholar-mcp?style=flat-square&logo=pypi&logoColor=white&label=PyPI&color=3775a9)](https://pypi.org/project/hasdata-google-scholar-mcp/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

## Contents

- [What you need](#what-you-need)
- [Quick start](#quick-start)
- [Example prompts](#example-prompts)
- [Tools](#tools)
- [Errors and failure paths](#errors-and-failure-paths)
- [Pricing, free tier and limits](#pricing-free-tier-and-limits)
- [Tool selection](#tool-selection)
- [How it compares](#how-it-compares)
- [FAQ](#faq)
- [HasData links](#hasdata-links)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## What you need

An MCP client and a HasData API key from the [dashboard](https://app.hasdata.com/sign-up?utm_source=github&utm_medium=syndication&utm_campaign=google-scholar-mcp), free to create with no card, and the free tier covers about 100 calls a month at the 10-credit rate. This is a remote server, so the simplest path is a URL and an `x-api-key` header, with no container to run. A client that only speaks stdio reaches it through a thin launcher, published as `@hasdata/google-scholar-mcp` on npm and `hasdata-google-scholar-mcp` on PyPI, shown below.

## Quick start

The server URL is the same for every client. We run it hands-on in Claude Code and Claude Desktop. The other blocks follow each client's own documented format for a remote server.

| Field | Value |
| :--- | :--- |
| URL | `https://mcp.hasdata.com/api/mcp?apis=google_scholar` |
| Transport | HTTP, streamable |
| Auth header | `x-api-key: HASDATA_API_KEY` |

Clients with OAuth support can add the same URL as a connector and sign in without putting a key in a config file.

<details>
<summary><b>Claude Code</b></summary>

```bash
claude mcp add --transport http google-scholar "https://mcp.hasdata.com/api/mcp?apis=google_scholar" \
  --header "x-api-key: HASDATA_API_KEY"
```

</details>

<details>
<summary><b>Claude Desktop</b></summary>

Settings, then Connectors, then Add custom connector, then paste `https://mcp.hasdata.com/api/mcp?apis=google_scholar` and sign in.

For the config-file route, Claude Desktop loads only local (stdio) servers, so it reaches a remote server through a stdio launcher. The `@hasdata/google-scholar-mcp` package is that launcher, and it reads the key from the environment. Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-scholar": {
      "command": "npx",
      "args": ["-y", "@hasdata/google-scholar-mcp"],
      "env": { "HASDATA_API_KEY": "YOUR_KEY" }
    }
  }
}
```

For Python instead of Node, swap the launcher for the PyPI package, which `uvx` runs without a manual install:

```json
{
  "mcpServers": {
    "google-scholar": {
      "command": "uvx",
      "args": ["hasdata-google-scholar-mcp"],
      "env": { "HASDATA_API_KEY": "YOUR_KEY" }
    }
  }
}
```

</details>

<details>
<summary><b>Cursor</b></summary>

`~/.cursor/mcp.json` for every project, or `.cursor/mcp.json` for one:

```json
{
  "mcpServers": {
    "google-scholar": {
      "url": "https://mcp.hasdata.com/api/mcp?apis=google_scholar",
      "headers": { "x-api-key": "HASDATA_API_KEY" }
    }
  }
}
```

</details>

<details>
<summary><b>Windsurf</b></summary>

`~/.codeium/windsurf/mcp_config.json`. Windsurf calls the field `serverUrl`, not `url`:

```json
{
  "mcpServers": {
    "google-scholar": {
      "serverUrl": "https://mcp.hasdata.com/api/mcp?apis=google_scholar",
      "headers": { "x-api-key": "HASDATA_API_KEY" }
    }
  }
}
```

</details>

<details>
<summary><b>VS Code</b></summary>

`.vscode/mcp.json` in the workspace:

```json
{
  "servers": {
    "google-scholar": {
      "type": "http",
      "url": "https://mcp.hasdata.com/api/mcp?apis=google_scholar",
      "headers": { "x-api-key": "HASDATA_API_KEY" }
    }
  }
}
```

</details>

## Example prompts

Each of these lands on one tool, or on two in sequence when the second needs an id the first returns.

- Find papers on transformer architectures published since 2023 and sort them by citation count.
- Who has cited this paper, and how has that grown year on year?
- Give me the BibTeX for this paper.
- Find review articles only on this topic, excluding citations without full records.
- Show me every indexed version of this paper and which of them have a PDF.
- Find recent work by this author on this topic.

A prompt naming a paper takes two calls, one search to reach its `resultId` and one citation lookup. A prompt about who cites a paper also takes two, because the second call reuses `citedBy.citesId` from the first.

## Tools

Two tools, 10 credits per successful call.

### Get Scholar search results

[`hasdata_google_scholar_scholar_getScholarSearchResults`](https://docs.hasdata.com/apis/google-scholar/scholar?utm_source=github&utm_medium=syndication&utm_campaign=google-scholar-mcp)

A page of Scholar results.

| Parameter | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `q` | string | yes | The query. Scholar operators such as `author:` and `source:` work here |
| `asYlo` / `asYhi` | number | | Published from and up to these years |
| `start` | number | | Result offset, where `0` is the first result |
| `num` | number | | Results per page |
| `scisbd` | number | | `1` sorts abstracts by date, `2` sorts everything by date. Omit for relevance |
| `cites` | string | | Find articles citing this one, using a `citedBy.citesId` |
| `cluster` | string | | Find every indexed version of an article, using a `versions.clusterId` |
| `asSdt` | string | | Search type, `0,5` for articles, `4` for case law, `0` or `7` for patents |
| `asRr` | number | | `1` returns review articles only |
| `asVis` | number | | `1` excludes citations, `0` includes them |
| `hl` | string | | Interface language, one of 159 |
| `lr` | array | | Restrict to these content languages |
| `safe` | string | | `active` or `off` |
| `filter` | number | | `1` keeps Google's similar and omitted result filters, `0` drops them |

Returns `searchInformation` with `totalResults`, `queryDisplayed` and the time Scholar reported, an `organicResults` array, and `pagination`.

Each result carries `position`, `resultId`, `title`, `link`, `snippet`, a `publicationInfo` object, a `resources` array, `citedBy`, `versions`, `relatedPagesLink` and `citeHasdataLink`.

`publicationInfo.authors` is the part worth knowing about. Alongside the raw `summary` line it lists the authors Scholar has profiles for, each with a `name`, a profile `link` and an `authorId`, which is how you follow one author rather than parsing a byline.

`citedBy` and `versions` are the two ids that make this tool compose with itself. `citedBy.citesId` goes back into `cites` to walk a citation graph, and `versions.clusterId` goes into `cluster` to see every indexed copy of the same paper.

```json
{
  "position": 1,
  "resultId": "A7L9JolPKkoJ",
  "title": "A historical survey of advances in transformer architectures",
  "link": "https://www.mdpi.com/2076-3417/14/10/4316",
  "snippet": "… of the Vision Transformer (ViT) opening a new realm of architectures which build … transformer architecture, it becomes pertinent to examine in detail the architecture of the transformer …",
  "publicationInfo": {
    "summary": "AR Sajun, I Zualkernan, D Sankalpa - Applied Sciences, 2024 - mdpi.com",
    "authors": [
      { "name": "AR Sajun", "authorId": "k6zWX4EAAAAJ", "link": "https://scholar.google.com/citations?user=k6zWX4EAAAAJ&hl=en" }
    ]
  },
  "resources": [{ "fileFormat": "Html", "title": "mdpi.com", "link": "https://www.mdpi.com/2076-3417/14/10/4316" }],
  "citedBy": { "total": 97, "citesId": "5344171358311789059" },
  "versions": { "total": 7, "clusterId": "5344171358311789059" }
}
```

### Get Scholar citation formats

[`hasdata_google_scholar_cite_getScholarCitationFormats`](https://docs.hasdata.com/apis/google-scholar/cite?utm_source=github&utm_medium=syndication&utm_campaign=google-scholar-mcp)

The citation block for one paper.

| Parameter | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `q` | string | yes | A `resultId` from a search result, not a search query |
| `hl` | string | | Interface language |

Returns `citations`, the formatted string in MLA, APA, Chicago, Harvard and Vancouver, and `links`, the export URLs for BibTeX, EndNote, RefMan and RefWorks.

```json
{
  "citations": [
    {
      "title": "APA",
      "snippet": "Sajun, A. R., Zualkernan, I., & Sankalpa, D. (2024). A historical survey of advances in transformer architectures. Applied Sciences, 14(10), 4316."
    }
  ],
  "links": [
    { "name": "BibTeX", "link": "https://scholar.googleusercontent.com/scholar.bib?q=info:A7L9JolPKkoJ:scholar.google.com/&output=citation..." }
  ]
}
```

## Errors and failure paths

Plan for these rather than assuming a happy path.

**On the citation tool, `q` is a paper id rather than a query.** It takes the `resultId` from a search result, such as `A7L9JolPKkoJ`. Passing a title or a DOI there returns nothing useful, and the shared parameter name is the reason people get this wrong.

**`citesId` and `clusterId` can hold the same value, and they are not interchangeable.** They were identical on the paper above. One goes into `cites` to find papers citing this one, the other into `cluster` to find copies of this one. Sending the right number to the wrong parameter returns a plausible page of the wrong thing.

**`type` arrives on some results and not others.** It was present on one result in five, describing the format of the primary resource. Read `resources[].fileFormat` when you need to know whether a PDF exists.

**A BibTeX link is a Scholar URL with a signature in it, not the BibTeX itself.** The `links` array gives you addresses to fetch, and those carry expiring `scisig` tokens, so fetch them promptly rather than storing them for later.

**`totalResults` is Scholar's estimate and it is very rough.** The query above reported 2,080,000. Treat it as an order of magnitude, never as a count.

**Scholar counts citations, not quality, and it indexes preprints, theses and citing-only records.** `asVis: 1` drops citation-only entries when you need records with full metadata.

**Paging deep gets thin.** Scholar limits how far a result set goes and starts repeating or blocking well before the estimate suggests, so narrow with `asYlo`, `asYhi` or `asSdt` rather than walking `start` upward.

Results that carry data also carry a `requestMetadata.id` worth quoting in support.

## Pricing, free tier and limits

Each Scholar tool costs **10 credits per successful call**. Response size does not change the price, so raising `num` is the cheap way to widen a search.

The free tier is **1,000 credits every month with no card**, which is 100 Scholar calls at the base rate. It renews with the billing cycle, so a low-volume agent runs on the free tier indefinitely.

Paid plans start at **$49 a month** for 200,000 credits, which is 20,000 calls. The unit price falls with volume, from **$2.45 per 1,000 calls** on the entry plan to **$1.00** on Business, **$0.84** on Growth and **$0.74** on the largest [high-volume plans](https://hasdata.com/prices?utm_source=github&utm_medium=syndication&utm_campaign=google-scholar-mcp).

Your plan also sets concurrency. The free tier allows 1 request at a time, Startup 15, Business 30, Growth 50, and the high-volume plans run from 200 to 1,500. Retry on the 429 with a backoff in anything unattended, because an agent that walks a citation graph will reach the ceiling before you do.

A request that comes back non-200 is not billed. A successful call that finds nothing is still a call.

## Tool selection

Start from what the prompt gives you. A topic, an author or a year range goes to the search tool. A `resultId` you already hold goes straight to the citation tool.

Then think about which id the next step needs. A literature sweep is one search call with a large `num`. A citation graph is a search call followed by one `cites` call per paper you follow. A deduplication pass across preprints and published versions is a `cluster` call per paper. Each of those reuses an id the first response already gave you, so a second search call is usually wasted.

Raise `num` before you page. Cost is per call rather than per result, so one wide page beats three narrow ones.

## How it compares

Google Scholar has no public API, so the comparison worth making is against the open bibliographic APIs.

| | OpenAlex or Semantic Scholar | This server |
| :--- | :--- | :--- |
| Eligibility | Open, no key for basic use | An API key |
| Coverage | Large, curated, DOI-centred | What Scholar indexes, including theses and preprints |
| Citation counts | Their own, computed from their graph | Scholar's, as displayed |
| Citation strings | Build them yourself from metadata | MLA, APA, Chicago, Harvard, Vancouver, as Scholar formats them |
| Full-text links | DOI and open-access locations | The resource links Scholar shows, including PDFs |
| Structured metadata | Rich and typed | As the page presents it |

The row that decides it is whose citation count you need. For bibliometrics on typed, stable metadata, OpenAlex and Semantic Scholar are better instruments and they are free. Reach for this one when the question is specifically about what Google Scholar shows, which is what most researchers actually look at, or when you want the formatted citation rather than the fields to build one.

## FAQ

### Is there an official Google Scholar MCP server?

Google does not publish one, and Scholar has no public API either. This one is maintained by HasData and reads public Scholar pages.

### What is a Google Scholar MCP server?

An MCP server exposes tools an AI client can call. This one turns Scholar search results and citation blocks into JSON an agent can reason over, without a browser or a scraping library in your stack.

### Do I need a Google account?

No. The only credential is your HasData key.

### How do I get the BibTeX for a paper?

Two calls. Search to get the paper's `resultId`, then pass that id as `q` to the citation tool, and take the BibTeX URL from `links`.

### How do I find everything that cites a paper?

Take `citedBy.citesId` from the search result and send it back as the `cites` parameter. The response is the citing papers, paged like any other search.

### What is the difference between `cites` and `cluster`?

`cites` finds papers that cite the one you named. `cluster` finds other indexed versions of that same paper, such as a preprint next to the published article. The two ids often look identical, so pick by what you want rather than by the number.

### Can I search by author?

Yes, with Scholar's own operator, as `author:"J Dean"` in `q`. Search results also carry `authorId` for authors with a Scholar profile, which is the stabler handle.

### Can I use this together with other HasData APIs?

Yes. One key covers everything, and one endpoint serves them all through the `apis` parameter. Point a client at `?apis=google_scholar,google_serp` to get both tool sets in one connection, or at [`mcp.hasdata.com/api/mcp`](https://docs.hasdata.com/mcp-server?utm_source=github&utm_medium=syndication&utm_campaign=google-scholar-mcp) for the full catalogue.

### Is HasData affiliated with Google?

No. HasData is an independent service and is not affiliated with, endorsed by, or sponsored by Google. Google Scholar is a trademark of its respective owner. The tools work with publicly available data only, and you are responsible for using the results in line with Google's terms and the law that applies to you.

### Compliance and personal data

Author names, affiliations and Scholar profile ids are personal data, even though they are published as part of the scholarly record. Building a profile of one researcher's output is a different act from counting citations on a topic, and it is the one that needs a second thought about purpose and retention. The papers themselves stay under their own licences, so a link is not permission to redistribute a PDF.

## HasData links

- [Google Scholar API documentation](https://docs.hasdata.com/apis/google-scholar/scholar?utm_source=github&utm_medium=syndication&utm_campaign=google-scholar-mcp), the REST endpoints behind these tools
- [Citation formats endpoint](https://docs.hasdata.com/apis/google-scholar/cite?utm_source=github&utm_medium=syndication&utm_campaign=google-scholar-mcp)
- [MCP server documentation](https://docs.hasdata.com/mcp-server?utm_source=github&utm_medium=syndication&utm_campaign=google-scholar-mcp)
- [Pricing](https://hasdata.com/prices?utm_source=github&utm_medium=syndication&utm_campaign=google-scholar-mcp)
- [Dashboard](https://app.hasdata.com/sign-up?utm_source=github&utm_medium=syndication&utm_campaign=google-scholar-mcp)

Other HasData MCP servers: [Google Search](https://github.com/HasData/google-search-mcp), [Google Images](https://github.com/HasData/google-images-mcp), [Google Maps](https://github.com/HasData/google-maps-mcp), [Google Trends](https://github.com/HasData/google-trends-mcp), [Bing](https://github.com/HasData/bing-mcp), [DuckDuckGo](https://github.com/HasData/duckduckgo-mcp), [YouTube](https://github.com/HasData/youtube-mcp), [TikTok](https://github.com/HasData/tiktok-mcp), [Instagram](https://github.com/HasData/instagram-mcp), [Amazon](https://github.com/HasData/amazon-mcp), [Walmart](https://github.com/HasData/walmart-mcp), [Shopify](https://github.com/HasData/shopify-mcp), [Yelp](https://github.com/HasData/yelp-mcp), [Yellow Pages](https://github.com/HasData/yellowpages-mcp), [Zillow](https://github.com/HasData/zillow-mcp), [Redfin](https://github.com/HasData/redfin-mcp), [Airbnb](https://github.com/HasData/airbnb-mcp), [Booking.com](https://github.com/HasData/booking-mcp), [Indeed](https://github.com/HasData/indeed-mcp), [Glassdoor](https://github.com/HasData/glassdoor-mcp).

## Development

The launcher is a thin stdio bridge to the remote server, so there is nothing to build.

```bash
npm install
HASDATA_API_KEY=your_key_here npm test
```

The tests in `test/` assert the tool contract, the part that can break without a commit here. They check that `?apis=google_scholar` returns the two expected tools, that no name changed, that both still require `q` and carry descriptions, that the search parameters this README documents are still in the schema, and that the key in use is actually accepted.

Two tests go further. One asserts that a live search still returns `resultId`, `citedBy.citesId` and `versions.clusterId`, because those three ids are what let the tools compose and nothing else in the response would reveal their loss. The other feeds a `resultId` straight into the citation tool, which is the two-call workflow this README documents, and checks the five styles come back. Together they cost 20 credits a run, which is the price of a canary that can fail for the right reason.

The contract suite also runs weekly on a schedule, because the upstream tool list can change without anyone touching this repository.

## Contributing

A tool table, a response sample or a documented behaviour that does not match reality is worth an issue. There is a template for exactly that. Pull requests are welcome for the same, and for anything in the launcher.

## License

MIT, see [LICENSE](LICENSE).
