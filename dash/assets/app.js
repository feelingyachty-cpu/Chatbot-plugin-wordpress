const BRIEFING = {
  date: "2026-08-14",
  generated_at: "2026-08-14T15:50:00Z",
  headline: "Instagram’s first wordmark refresh in a decade, Meta’s holiday clock is already running, and LinkedIn is still our weakest owned channel.",
  items: [
    {
      title: "Instagram introduces a redesigned wordmark",
      url: "https://techcrunch.com/2026/08/13/instagram-introduces-a-redesigned-wordmark/",
      source: "TechCrunch",
      published: "2026-08-13",
      summary: "Adam Mosseri launched a new Instagram wordmark on 13 Aug 2026 — the first script change in ten years. The rainbow camera app icon is unchanged. Designers kept cursive so the brand still feels handmade; some users read the r as a z. New fonts shipped with it. Meta would not confirm an icon redesign.",
      fy_action: "Swap any template that hard-codes the 2016 Instagram script. Do not rebuild the brand around a logo meme.",
      tags: ["instagram", "brand"],
      more: "https://www.itsnicethat.com/features/behind-instagrams-first-major-refresh-in-10-years-partnership-130826"
    },
    {
      title: "Meta publishes holiday marketing guides",
      url: "https://www.socialmediatoday.com/news/meta-publishes-holiday-marketing-guides/827856/",
      source: "Social Media Today",
      published: "2026-08-11",
      summary: "Meta’s 2026 holiday playbook says waiting until November is already late. Use Reels for discovery, Partnership ads for trust, and Advantage+ for conversion. Black Friday is 27 Nov 2026 with a short run to Christmas. SMBs were told to have ads learning by mid-October.",
      fy_action: "Put NYE, Art Basel, and holiday corporate packages into Advantage+ tests in September–October. Pair with WhatsApp/message CTAs.",
      tags: ["meta", "ads", "seasonal"]
    },
    {
      title: "Meta shares holiday 2026 tips for small businesses",
      url: "https://www.socialmediatoday.com/news/meta-shares-holiday-2026-tips-for-small-businesses/826785/",
      source: "Social Media Today",
      published: "2026-08-02",
      summary: "Holiday Insights Center plus a 15,000-shopper survey: 85% bought in-store after seeing something on Meta apps, 59% messaged a business, 94% look to creators, and AI-assisted shopping is rising.",
      fy_action: "Treat messaging as a conversion path, not a leftover inbox. Creators on real water beat another studio still.",
      tags: ["meta", "smb"]
    },
    {
      title: "Social media updates and new features to know this week",
      url: "https://www.prdaily.com/social-media-updates-and-new-features-to-know-this-week-53/",
      source: "PR Daily",
      published: "2026-08-13",
      summary: "X is rewriting creator payouts toward original content. LinkedIn ranks comments by professional relevance. Meta Edits is adding beta tools. Meta One gets extra profile links and up to three business locations. YouTube launched Live Practice Mode.",
      fy_action: "Add Miami + Panama as locations if on Meta One. Rehearse yacht lives in Practice Mode. Seed a useful first comment on every LinkedIn post.",
      tags: ["linkedin", "youtube", "meta"]
    },
    {
      title: "Social Media Trends Report: August 3, 2026",
      url: "https://drizzledigital.com/social-media-trends-august-2026/",
      source: "Drizzle Digital",
      published: "2026-08-03",
      summary: "Formats in circulation: Do Not Disturb, guess-the-brand-color, home-is-anywhere, how-to-summon-me. Instagram now lets you replace audio on already-published feed posts and carousels without deleting them.",
      fy_action: "Optional: a “how to summon the captain” Reel and a Biscayne “home is anywhere” still. Skip color-swatch trends unless it is a signature hull.",
      tags: ["trends", "organic"]
    },
    {
      title: "Social Media Today — daily desk",
      url: "https://www.socialmediatoday.com/",
      source: "Social Media Today",
      published: "2026-08-14",
      summary: "Meta still has the widest social reach. Instagram will charge for some AI access. Meta added dedicated ad exclusion audiences. Google Ads and Analytics are adding advisor-style AI. X added Grok insights in Ads Manager. People are posting less — paid and strong creative gain share.",
      fy_action: "When the booker list is ready, exclude recent purchasers from prospecting. Do not open X ads this month.",
      tags: ["meta", "google", "industry"]
    },
    {
      title: "About Google Ads certifications",
      url: "https://support.google.com/google-ads/answer/9702955",
      source: "Google Ads Help",
      published: "2026-08-14",
      summary: "Skillshop exams: 80% to pass, 75 minutes, timer cannot pause, retake after one day, valid 12 months. Search, Display, Video, Shopping, and Apps count toward a company’s Partner badge.",
      fy_action: "Sit Search + Measurement first. Put expiry dates on this dash when someone passes.",
      tags: ["google", "training"]
    }
  ]
};

const SOURCES = [
  ["Social Media Today", "Daily platform news", "https://www.socialmediatoday.com/"],
  ["Meta for Business blog", "First-party Meta ads and product", "https://www.facebook.com/business/news"],
  ["Google Ads & Commerce blog", "First-party Google ads changes", "https://blog.google/products/ads-commerce/"],
  ["Search Engine Land", "Search, GSC, GA4, paid search", "https://searchengineland.com/"],
  ["Social Media Examiner", "Practitioner how-tos", "https://www.socialmediaexaminer.com/"],
  ["Buffer Resources", "Organic research", "https://buffer.com/resources"],
  ["Hootsuite Blog", "Multi-platform ops", "https://blog.hootsuite.com/"],
  ["Sprout Social Insights", "Benchmarks and listening", "https://sproutsocial.com/insights/"],
  ["Later Blog", "IG / TikTok / Reels practice", "https://later.com/blog/"],
  ["PR Daily", "Weekly what-shipped digest", "https://www.prdaily.com/"],
  ["SocialSeconds", "Viral audio and culture", "https://socialseconds.com/"],
  ["TikTok Creative Center", "Official trends and ads", "https://ads.tiktok.com/business/creativecenter"],
  ["Meta Ads Help", "Official Ads Manager docs", "https://www.facebook.com/business/help"],
  ["Google Ads Help", "Official campaign docs", "https://support.google.com/google-ads"],
  ["Analytics Help", "GA4 official", "https://support.google.com/analytics"],
  ["Search Console Help", "GSC official", "https://support.google.com/webmasters"],
  ["Skift", "Luxury / travel demand", "https://skift.com/"]
];

const TRAINING = [
  ["Meta Blueprint", "Facebook / Instagram / WhatsApp ads. Courses free; Associate exam ~$99.", "https://www.facebook.com/business/learn"],
  ["Google Skillshop", "Ads + GA4 certs. Free exams, 12-month validity, 80% pass.", "https://skillshop.withgoogle.com/"],
  ["HubSpot Academy Social", "Best free strategy credential. ~5 hours.", "https://academy.hubspot.com/courses/social-media"],
  ["Hootsuite Academy", "Operations, calendars, community, multi-platform workflow.", "https://education.hootsuite.com/"],
  ["Meta Professional Certificate (Coursera)", "Structured 4–6 month Meta path, includes Associate exam.", "https://www.coursera.org/professional-certificates/facebook-social-media-marketing"],
  ["Google Digital Marketing Certificate", "Ads, analytics, ecommerce measurement end-to-end.", "https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce"],
  ["TikTok Academy + Creative Center", "Short-form and Spark Ads from the source.", "https://ads.tiktok.com/business/learn"],
  ["LinkedIn Learning", "Fixes our weakest channel: the company page.", "https://www.linkedin.com/learning/"],
  ["Semrush Academy", "Ties social captions to SEO and GSC queries.", "https://www.semrush.com/academy/"],
  ["Digital Marketing Institute", "Formal specialist credential after the official ones.", "https://digitalmarketinginstitute.com/"]
];

function $(sel) { return document.querySelector(sel); }

function renderBriefing() {
  $("#briefing-date").textContent = BRIEFING.date;
  $("#briefing-headline").textContent = BRIEFING.headline;
  const host = $("#briefing-list");
  host.innerHTML = BRIEFING.items.map((item) => `
    <article class="card span-6 article">
      <div class="kicker">${item.source}</div>
      <h3>${item.title}</h3>
      <div class="meta-row">${item.published} · <a href="${item.url}" target="_blank" rel="noopener">Open original article</a></div>
      <p class="muted">${item.summary}</p>
      <div class="action"><strong>For Feeling Yachty:</strong> ${item.fy_action}</div>
      <div class="tags">${item.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
    </article>
  `).join("");
}

function renderSources() {
  $("#source-table").innerHTML = SOURCES.map(([name, why, url]) => `
    <tr>
      <td><a href="${url}" target="_blank" rel="noopener">${name}</a></td>
      <td>${why}</td>
    </tr>
  `).join("");
}

function renderTraining() {
  $("#training-list").innerHTML = TRAINING.map((row, i) => `
    <li><strong>${i + 1}. ${row[0]}</strong> — ${row[1]} <a href="${row[2]}" target="_blank" rel="noopener">Open</a></li>
  `).join("");
}

function activate(name) {
  document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === `panel-${name}`));
  document.querySelectorAll("nav.tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  history.replaceState(null, "", `#${name}`);
}

document.querySelectorAll("nav.tabs button").forEach((btn) => {
  btn.addEventListener("click", () => activate(btn.dataset.tab));
});

renderBriefing();
renderSources();
renderTraining();
activate((location.hash || "#briefing").slice(1) || "briefing");
