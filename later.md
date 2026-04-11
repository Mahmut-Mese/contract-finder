# later.md
# Alternative Job Data Sources & Future Integrations

**Important Note**  
These sources are **NOT needed for Phase 0 or Phase 1**.  
We start with **Adzuna + post-filter** as primary.  
This file is a living reference for expansion (Phase 2+).

### Recommended Order for Adding Sources (2026)

**1. Jooble (Strongest Free Alternative)**  
- Best for: General job aggregation with decent contract coverage.  
- Free tier: Quite generous.  
- Pros: Easy REST API, good UK coverage, often better contract detection than Adzuna.  
- Cons: Still needs post-filter.  
- Recommendation: First alternative to test.

**2. Reed.co.uk API (Official UK Job Board)**  
- Best for: Strong UK-focused contract and IT jobs.  
- Free tier: Free API key (Jobseeker API).  
- Pros: Official, reliable, good contract filtering.  
- Cons: Requires key approval, rate limits.  
- Recommendation: Excellent stable UK secondary source.

**3. DevITjobs UK (Tech-Specific, Free)**  
- Best for: Pure IT/developer jobs in the UK (GraphQL + XML feed).  
- Free tier: Completely free/open feed.  
- Pros: Highly relevant for developers, zero cost.  
- Cons: Smaller volume.  
- Recommendation: Excellent free tech supplement.

**4. LoopCV (Unified Aggregator)**  
- Best for: One API pulling from 30+ job boards.  
- Free tier: Available and usable for MVP.  
- Pros: Clean JSON, big time saver.  
- Recommendation: Strong Phase 2 candidate.

**5. TheirStack**  
- Best for: Broad multi-source coverage + built-in deduplication.  
- Free tier: 200 credits/month.  
- Pricing: Starts at $59/month.  
- Pros: Near real-time, excellent for aggregators.  
- Recommendation: Add after initial revenue.

**6. Public ATS Feeds (Very Clean & Free)**  
- Greenhouse, Lever, Ashby, Workable (public job posting APIs).  
- Best for: Clean, structured JSON from company career pages.  
- Free tier: Public endpoints (no key needed for many).  
- Pros: High-quality, structured data.  
- Recommendation: Great low-effort supplement.

**7. Other Strong 2026 Options**  
- **Crustdata** -> Real-time job posting data API.  
- **Coresignal** -> Strong job + company data (credit-based).  
- **Mantiks.io** -> UK IT-focused enriched jobs (50 free credits).  
- **SerpApi (Google Jobs)** -> 100 free searches/month, real-time.  
- **Arbeitnow** -> Simple Europe/remote API.  
- **Findwork** -> Tech-focused, free tier.  
- **Jobicy** -> Remote jobs, easy JSON feed.  
- **Bloomberry** -> Per-job pricing, good for niche boards.  
- **Sumble** -> Credit-based, developer-friendly.

**8. Enterprise / Paid Scraping (Later Only)**  
- Bright Data, Oxylabs, Coresignal (bulk/historical data).  
- Recommendation: Only when you have revenue and need maximum volume.

### LinkedIn Guest Search Endpoint (Optional / Future Only)

**Endpoint**:  
`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search`

**Example for React contracts posted today (UK)**:  

`https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=react%20developer%20contract%20freelance%20day%20rate&location=United%20Kingdom&f_TPR=r86400&f_JT=C&start=0`

#### Useful Parameters (2026)

| Parameter | What it does | Common values | Example |
|-----------|--------------|---------------|---------|
| `f_JT` | Job Type | F=Full-time, P=Part-time, `C=Contract` | `f_JT=C` |
| `f_TPR` | Time Posted Range | `r86400` = past 24 hours | `f_TPR=r86400` |
| `f_WT` | Work Type | `1=On-site`, `2=Remote`, `3=Hybrid` | `f_WT=2` |
| `start` | Pagination | `0`, `25`, `50`, `75`... | `start=0` |
| `keywords` | Search keywords | Any text (URL encoded) | `react%20developer%20contract` |
| `location` | Location | `United Kingdom`, etc. | `location=United%20Kingdom` |

**Warning**: Returns HTML (not clean JSON), fragile, and has blocking risk. Use only as a future supplement.

---

**File Status**: Updated April 2026 with many more realistic sources.  
We will only expand when we reach later phases.
