---
description: A literature sweep on a topic, with citation counts and the papers that cite the leaders
---

Sweep the literature on a topic.

Ask me for the topic and the year range if I have not given them.

Then:

1. Call `hasdata_google_scholar_scholar_getScholarSearchResults` with `q`, `asYlo` and `asYhi`, and set `num` high rather than planning to page, then say how many results actually came back. Scholar operators such as `author:` and `source:` work inside `q`.
2. Report `totalResults` as an order of magnitude only, and say that is what it is.
3. List the papers by `citedBy.total`, giving the title, and the authors, year and venue parsed out of the `publicationInfo.summary` string, which is where all three live rather than in fields of their own. Say whether `resources` carries a fetchable file.
4. Take the two most cited and call the search tool again with their `citedBy.citesId` in `cites`, so I see who built on them. Do not put that id into `cluster`, which answers a different question.
5. For anything I ask to quote, call `hasdata_google_scholar_cite_getScholarCitationFormats` with the paper's `resultId` as `q`, and give me the APA string.

Nothing in the response states publication status, so when the `link` or the `publicationInfo.summary` points at a preprint server or a university repository, say that is what it looks like rather than asserting it. Citation counts here are Scholar's own.
