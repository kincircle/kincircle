import Link from "next/link";
import "./landing.css";

const LogoMark = ({ ringColor = "oklch(0.55 0.13 40)" }: { ringColor?: string }) => (
  <svg viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="14" stroke={ringColor} strokeWidth="2" />
    <circle cx="11" cy="14" r="2.5" fill="oklch(0.55 0.13 40)" />
    <circle cx="21" cy="14" r="2.5" fill="oklch(0.78 0.13 75)" />
    <circle cx="13" cy="20" r="2.5" fill="oklch(0.78 0.13 75)" />
    <circle cx="19" cy="20" r="2.5" fill="oklch(0.55 0.13 40)" />
  </svg>
);

export default function Home() {
  return (
    <>
      <nav className="landing-nav">
        <a href="#" className="landing-logo">
          <span className="mark"><LogoMark /></span>
          KinCircle
        </a>
        <ul className="landing-nav-links">
          <li><a href="#how">How it works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#stories">Stories</a></li>
        </ul>
        <Link href="/dashboard" className="btn-pill primary">Start a reunion &rarr;</Link>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow">
            <span className="eyebrow-dot">&#10038;</span>
            The cousin coordination problem, solved
          </div>
          <h1>
            Get the <em>whole</em> family<br />
            around <span className="underlined">one table.</span>
          </h1>
          <p className="lede">
            KinCircle takes the chaos out of family reunions &mdash; invites, dates, addresses, and a meeting spot that actually works for everyone. So you can spend less time herding texts, and more time at the table.
          </p>
          <div className="hero-cta">
            <Link href="/dashboard" className="btn-pill primary">Plan your reunion &mdash; free</Link>
            <a href="#how" className="btn-pill ghost">See how it works</a>
          </div>
          <div className="hero-meta">
            <div className="avatar-stack-row">
              <div className="avatar-stack" />
              <div className="avatar-stack" />
              <div className="avatar-stack" />
              <div className="avatar-stack" />
            </div>
            <span>Trusted by 4,000+ families since last summer</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/Hero_image__ratio_169__prompt__a_candid_multigener_8d3011efec.jpeg"
              alt="A multigenerational family laughing around a long outdoor dinner table at golden hour"
            />
          </div>

          <div className="floating-card card-1">
            <div className="icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <div>
              <div className="label">Date locked</div>
              <div className="sublabel">Sat, July 11 &middot; 12 votes</div>
            </div>
          </div>

          <div className="floating-card card-2">
            <div className="icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <div className="label">Halfway point</div>
              <div className="sublabel">Branson, MO</div>
            </div>
          </div>
        </div>
      </section>

      <div className="marquee">
        <div className="marquee-track">
          {["Reunions", "Cousins", "Grandkids", "Long tables", "Old recipes", "Group photos",
            "Reunions", "Cousins", "Grandkids", "Long tables", "Old recipes", "Group photos"].map((w, i) => (
            <span key={i} className="marquee-item">{w}</span>
          ))}
        </div>
      </div>

      <section className="block" id="how">
        <span className="section-eyebrow">How it works</span>
        <h2 className="section-title">From scattered group chats to <em>one shared plan.</em></h2>
        <p className="section-sub">Five steps from &ldquo;we should really get together&rdquo; to actually getting together.</p>

        <div className="how-grid">
          <div className="how-step">
            <span className="step-num">i.</span>
            <div className="step-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16M4 12h16"/></svg>
            </div>
            <h3>Create the reunion</h3>
            <p>Give it a name, a rough timeframe, and a personal note. KinCircle handles the rest of the setup.</p>
          </div>
          <div className="how-step">
            <span className="step-num">ii.</span>
            <div className="step-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><path d="M4 8l8 5 8-5"/></svg>
            </div>
            <h3>Invite households</h3>
            <p>One email per household, not per person. Each household claims their invite and adds members and address.</p>
          </div>
          <div className="how-step">
            <span className="step-num">iii.</span>
            <div className="step-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>
            </div>
            <h3>Vote on dates</h3>
            <p>Propose up to four date options. Everyone votes. The democratic weekend wins &mdash; no more reply-all chains.</p>
          </div>
          <div className="how-step">
            <span className="step-num">iv.</span>
            <div className="step-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <h3>Find the meeting spot</h3>
            <p>KinCircle calculates the geographic center of every household so nobody draws the long-drive straw.</p>
          </div>
          <div className="how-step" style={{ gridColumn: "1 / -1" }}>
            <span className="step-num">v.</span>
            <div className="step-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5l-7 7 7 7"/><path d="M4 12h16"/></svg>
            </div>
            <h3>Keep everyone in the loop</h3>
            <p>Post announcements, share what to bring, count down the days. The reunion stays alive between now and &ldquo;see you there.&rdquo;</p>
          </div>
        </div>
      </section>

      <section className="block" id="features" style={{ background: "var(--bg-warm)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          <div className="feature-row">
            <div>
              <span className="section-eyebrow">Households, not headcounts</span>
              <h3>Aunt Linda doesn&apos;t want to <em>type her own address</em> twice.</h3>
              <p>Invite by household, not by individual. Each household claims their invite, fills in who&apos;s coming (with age groups for the kids&apos; table), and confirms their address &mdash; once.</p>
              <ul className="feature-checks">
                <li>One claim link per household, no app download required</li>
                <li>Capture members + age groups so you can plan accordingly</li>
                <li>Track who&apos;s claimed, who&apos;s voted, who&apos;s ghosting at a glance</li>
              </ul>
            </div>
            <div className="mock">
              <div className="mock-header">
                <div className="mock-title">Carter Family Reunion 2026</div>
                <span className="mock-pill">12 households</span>
              </div>
              {[
                { i: "C", n: "The Carters (Boston)", d: "Mom, Dad, 3 kids · 5 members", s: "claimed", t: "Claimed", bg: "oklch(0.55 0.13 40)" },
                { i: "P", n: "Aunt Patty", d: "1 member · Tucson, AZ", s: "voted", t: "Voted", bg: "oklch(0.78 0.13 75)", color: "oklch(0.22 0.02 40)" },
                { i: "M", n: "Maria & Joe", d: "2 adults, 1 teen · Atlanta, GA", s: "claimed", t: "Claimed", bg: "oklch(0.42 0.12 38)" },
                { i: "G", n: "Grandma Ruth", d: "Invited · Chicago, IL", s: "pending", t: "Pending", bg: "oklch(0.65 0.14 70)" },
              ].map((h) => (
                <div key={h.i} className="household-row-mock">
                  <div className="household-avatar" style={{ background: h.bg, color: h.color }}>{h.i}</div>
                  <div className="household-info">
                    <div className="name">{h.n}</div>
                    <div className="detail">{h.d}</div>
                  </div>
                  <span className={`status-badge status-${h.s}`}>{h.t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="feature-row reversed">
            <div>
              <span className="section-eyebrow">Pick a date, gracefully</span>
              <h3>Four options. <em>One winner.</em> Zero passive-aggressive group texts.</h3>
              <p>Propose up to four candidate weekends. Every household gets one vote. KinCircle tallies in real time, and you lock the winner with one click.</p>
              <ul className="feature-checks">
                <li>Up to 4 date options with vote tallies</li>
                <li>Real-time results, viewable by everyone</li>
                <li>Soft reminders for the cousin who hasn&apos;t voted (you know who)</li>
              </ul>
            </div>
            <div className="mock">
              <div className="mock-header">
                <div className="mock-title">When should we gather?</div>
                <span className="mock-pill">Voting open</span>
              </div>
              <div className="date-options">
                {[
                  { day: "Sat, June 27", detail: "Memorial weekend", w: 30, c: 3 },
                  { day: "Sat, July 11", detail: "Mid-summer · winner", w: 100, c: 12, winner: true },
                  { day: "Sat, August 1", detail: "Late summer", w: 50, c: 5 },
                  { day: "Sat, Sept 5", detail: "Labor Day", w: 20, c: 2 },
                ].map((d) => (
                  <div key={d.day} className={`date-option${d.winner ? " winner" : ""}`}>
                    <div className="date-info">
                      <span className="day">{d.day}</span>
                      <span className="date-detail">{d.detail}</span>
                    </div>
                    <div className="vote-bar">
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${d.w}%` }} /></div>
                      <span className="vote-count">{d.c}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="feature-row">
            <div>
              <span className="section-eyebrow">Geographic compromise</span>
              <h3>Meet in the <em>middle</em> &mdash; actually.</h3>
              <p>Once everyone&apos;s address is in, KinCircle finds the geographic center and suggests a meeting town. No more &ldquo;but we always come to you.&rdquo; Lock the location and start counting down.</p>
              <ul className="feature-checks">
                <li>Auto-calculated centroid from every household&apos;s address</li>
                <li>Suggests nearby towns with hotels, parks, and restaurants</li>
                <li>One-click lock &mdash; directions sent to everyone</li>
              </ul>
            </div>
            <div className="mock">
              <div className="mock-header">
                <div className="mock-title">Suggested meeting point</div>
                <span className="mock-pill">5 households</span>
              </div>
              <div className="map-mock">
                <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 30 80 Q 60 60 100 70 L 140 60 Q 180 55 220 65 L 270 60 Q 310 65 350 75 L 370 100 Q 365 130 360 150 L 350 180 Q 320 195 290 190 L 250 195 Q 210 200 170 195 L 130 200 Q 90 195 60 180 L 40 150 Q 30 120 30 80 Z"
                    fill="oklch(0.78 0.05 70 / 0.5)" stroke="oklch(0.55 0.08 50)" strokeWidth="1.5" strokeDasharray="2 3" />
                  {[[80,100],[320,100],[120,170],[290,170],[220,80]].map(([x,y],i) => (
                    <line key={i} x1={x} y1={y} x2="200" y2="130" stroke="oklch(0.55 0.13 40 / 0.4)" strokeWidth="1.5" strokeDasharray="3 3" />
                  ))}
                </svg>
                <div className="map-pin household" style={{ top: "35%", left: "18%" }} />
                <div className="map-pin household" style={{ top: "35%", left: "78%" }} />
                <div className="map-pin household" style={{ top: "65%", left: "28%" }} />
                <div className="map-pin household" style={{ top: "65%", left: "70%" }} />
                <div className="map-pin household" style={{ top: "28%", left: "53%" }} />
                <div className="map-pin center" style={{ top: "47%", left: "47%" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: "1.05rem" }}>Branson, Missouri</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>Avg. drive: 4h 12m &middot; Halfway between everyone</div>
                </div>
                <button className="btn-pill primary" style={{ padding: "8px 14px", fontSize: "0.85rem" }}>Lock it in</button>
              </div>
            </div>
          </div>

        </div>
      </section>

      <section className="lifestyle">
        <div className="intro">
          <span className="section-eyebrow">The point of all this</span>
          <h2>It was never <em>about the spreadsheet.</em></h2>
          <p>Plates passed across the table. Cousins finally meeting cousins. The grandkids who only know each other by name. KinCircle is a tool. The reunion is the point.</p>
        </div>
        <div className="lifestyle-grid">
          {/* eslint-disable @next/next/no-img-element */}
          <figure className="span-2">
            <img src="/images/Outdoor_gathering_banner_ratio_219_prompt_wide_cin_8fd89a70be.jpeg" alt="Outdoor pavilion family gathering by a lake" />
            <figcaption>Saturdays look like this.</figcaption>
          </figure>
          <figure>
            <img src="/images/Hands_passing_dishes_family_reunion_77205c2cd8.jpeg" alt="Hands passing food across a table" />
            <figcaption>Every plate has a story.</figcaption>
          </figure>
          <figure>
            <img src="/images/Kids_grandparents_family_reunion_4a2cad3fce.jpeg" alt="Grandparents laughing with grandkids" />
            <figcaption>Three generations, one porch.</figcaption>
          </figure>
          <figure>
            <img src="/images/Kids_grandparents_family_reunion_64ca7d140a.jpeg" alt="Kids and grandparents at a family reunion" />
            <figcaption>The kids&apos; table is loud.</figcaption>
          </figure>
          <figure>
            <img src="/images/Hands_passing_dishes_family_reunion_ff5ea115d1.jpeg" alt="Family hands sharing food" />
            <figcaption>Bring something. Anything.</figcaption>
          </figure>
          {/* eslint-enable @next/next/no-img-element */}
        </div>
      </section>

      <section className="testimonial">
        <div className="testimonial-inner">
          <blockquote>
            We hadn&apos;t all been together since 2017. KinCircle is what finally got us into one room &mdash; 27 of us, four states, three generations. My grandma cried. Twice.
          </blockquote>
          <cite>
            <span className="cite-name">Maya Okonkwo</span>
            <span className="cite-role">Reunion organizer &middot; Okonkwo family &middot; Houston</span>
          </cite>
        </div>
      </section>

      <section className="stats">
        <div className="stats-grid">
          <div>
            <div className="stat-num">4,200<em>+</em></div>
            <div className="stat-label">Reunions planned</div>
          </div>
          <div>
            <div className="stat-num">38<em>k</em></div>
            <div className="stat-label">Family members reunited</div>
          </div>
          <div>
            <div className="stat-num">94<em>%</em></div>
            <div className="stat-label">Reunions actually happen</div>
          </div>
          <div>
            <div className="stat-num">0</div>
            <div className="stat-label">Reply-all email chains</div>
          </div>
        </div>
      </section>

      <section className="final-cta" id="stories">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="bg-photo" src="/images/Final_cta_image_____ratio_169_____prompt_____a_rel_484ce1f63d.jpeg" alt="" />
        <h2>The next reunion is the<br /><em>one you actually plan.</em></h2>
        <p>Free to start. No credit card. Your first reunion is on us.</p>
        <Link href="/dashboard" className="btn-pill primary" style={{ fontSize: "1rem", padding: "14px 28px" }}>Start a reunion &rarr;</Link>
      </section>

      <footer className="landing-footer">
        <div className="footer-top">
          <div>
            <a href="#" className="landing-logo">
              <span className="mark"><LogoMark ringColor="oklch(0.78 0.13 75)" /></span>
              KinCircle
            </a>
            <p className="tagline">Gather the people who matter, in the place that makes sense.</p>
          </div>
          <div>
            <h5>Product</h5>
            <ul>
              <li><a href="#">How it works</a></li>
              <li><a href="#">Features</a></li>
              <li><a href="#">Pricing</a></li>
              <li><a href="#">Mobile app</a></li>
            </ul>
          </div>
          <div>
            <h5>Resources</h5>
            <ul>
              <li><a href="#">Reunion guide</a></li>
              <li><a href="#">Family stories</a></li>
              <li><a href="#">Help center</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
          <div>
            <h5>Company</h5>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Terms</a></li>
              <li><a href="#">Press</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; 2026 KinCircle. Made with warm light.</span>
          <span>v 1.4.0 &middot; Saint Louis & beyond</span>
        </div>
      </footer>
    </>
  );
}
