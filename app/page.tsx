"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  MessageSquareText,
  FileSearch,
  ShieldAlert,
  FilePlus2,
  Menu,
  X
} from 'lucide-react'
import styles from './landing.module.css'

function AnimatedCounter({ endValue, suffix = '' }: { endValue: number, suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let animationFrameId: number;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) {
        cancelAnimationFrame(animationFrameId)
        setCount(0)
        return
      }
      let startTime: number | null = null
      const duration = 600
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp
        const progress = Math.min((timestamp - startTime) / duration, 1)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        setCount(Math.floor(easeOut * endValue))
        if (progress < 1) animationFrameId = requestAnimationFrame(step)
        else setCount(endValue)
      }
      animationFrameId = requestAnimationFrame(step)
    }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(animationFrameId)
    }
  }, [endValue])

  return <span ref={ref}>{count}{suffix && <sup>{suffix}</sup>}</span>
}

function AnimatedWordmark({ text }: { text: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setIsVisible(true)
    }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={styles.footerWordmark}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className={`${styles.footerWordmarkLetter} ${isVisible ? styles.visible : ''}`}
          style={{ transitionDelay: `${i * 70}ms` }}
        >
          {char}
        </span>
      ))}
    </div>
  )
}

export default function LandingPage(): React.JSX.Element {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) return

    let animationFrameId: number
    const handleScroll = () => {
      // Only process parallax when hero is in view
      if (window.scrollY <= window.innerHeight * 1.5) {
        animationFrameId = requestAnimationFrame(() => {
          setScrollY(window.scrollY)
        })
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // initial set

    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const elements = document.querySelectorAll(`.${styles.reveal}`)
      const observer = new IntersectionObserver((entries) => {
        const intersecting = entries.filter(e => e.isIntersecting)
        intersecting.forEach((entry, index) => {
          const el = entry.target as HTMLElement
          if (!el.style.transitionDelay) {
            el.style.transitionDelay = `${index * 80}ms`
          }
          if (styles.visible) el.classList.add(styles.visible)
          observer.unobserve(el)
        })
      }, { threshold: 0.15 })
      elements.forEach(el => observer.observe(el))
      return () => observer.disconnect()
    }
  }, [])

  return (
    <div className={styles.page}>

      {/* ===== HERO (navbar sits inside as transparent overlay) ===== */}
      <section className={styles.hero}>
        {/* Full-bleed background image with parallax wrapper */}
        <div 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: '-40%',
            transform: `translateY(${scrollY * 0.35}px)`,
            zIndex: 0,
            willChange: 'transform'
          }}
          aria-hidden="true"
        >
          <Image
            src="/hero-image.png"
            alt="Lady Justice statue representing legal clarity"
            fill
            className={styles.heroBg}
            priority
            sizes="100vw"
          />
        </div>
        {/* Dark gradient overlay */}
        <div className={styles.heroOverlay} aria-hidden="true" />

        {/* Transparent Navbar overlaid on hero */}
        <nav className={styles.navbar}>
          <div className={styles.navInner}>
            <Link href="/" className={styles.navLogo}>
              <Image
                src="/light-logo.png"
                alt="Nexalaw"
                width={130}
                height={34}
                priority
              />
            </Link>

            {/* Desktop Links */}
            <div className={styles.navLinks}>
              <Link href="/" className={styles.navLink}>Home</Link>
              <Link href="#features" className={styles.navLink}>About Us</Link>
              <Link href="#features" className={styles.navLink}>Features</Link>
            </div>
            
            {/* Desktop CTA */}
            <Link href="/auth" className={styles.navCta}>Get Started</Link>

            {/* Mobile Hamburger Icon */}
            <button 
              className={styles.mobileMenuBtn} 
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={28} color="#fff" />
            </button>
          </div>
        </nav>

        {/* Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <div className={styles.mobileDrawer}>
            <div className={styles.mobileDrawerHeader}>
              <Link href="/" className={styles.navLogo} onClick={() => setIsMobileMenuOpen(false)}>
                <Image
                  src="/light-logo.png"
                  alt="Nexalaw"
                  width={130}
                  height={34}
                  priority
                />
              </Link>
              <button 
                className={styles.mobileCloseBtn} 
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={28} color="#fff" />
              </button>
            </div>
            <div className={styles.mobileDrawerLinks}>
              <Link href="/" className={styles.mobileNavLink} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
              <Link href="#features" className={styles.mobileNavLink} onClick={() => setIsMobileMenuOpen(false)}>About Us</Link>
              <Link href="#features" className={styles.mobileNavLink} onClick={() => setIsMobileMenuOpen(false)}>Features</Link>
              <Link href="/auth" className={styles.mobileNavCta} onClick={() => setIsMobileMenuOpen(false)}>Get Started</Link>
            </div>
          </div>
        )}

        {/* Bottom-left headline */}
        <div className={styles.heroBottomLeft}>
          <h1 className={styles.heroTitle}>
            Legal documents,<br />
            read out loud<br />
            in your language
          </h1>
        </div>

        {/* Bottom-right subtitle */}
        <div className={styles.heroBottomRight}>
          <p className={styles.heroSubtitle}>
            Ask any legal question in plain language, upload a
            contract for a clause-by-clause breakdown, or
            generate a first-draft NDA in minutes, all before
            you sign anything.
          </p>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className={styles.stats}>
        <div className={styles.statsInner}>
          <div className={`${styles.statItem} ${styles.reveal}`}>
            <span className={styles.statNumber}><AnimatedCounter endValue={1} suffix="k+" /></span>
            <span className={styles.statLabel}>Legal questions answered<br />in plain English</span>
          </div>
          <div className={`${styles.statDivider} ${styles.reveal}`} />
          <div className={`${styles.statItem} ${styles.reveal}`}>
            <span className={styles.statNumber}><AnimatedCounter endValue={3} suffix="+" /></span>
            <span className={styles.statLabel}>Document types analysed<br />and simplified by AI</span>
          </div>
          <div className={`${styles.statDivider} ${styles.reveal}`} />
          <div className={`${styles.statItem} ${styles.reveal}`}>
            <span className={styles.statNumber}><AnimatedCounter endValue={20} suffix="s" /></span>
            <span className={styles.statLabel}>Average time to get plain-<br />English answers</span>
          </div>
        </div>
      </section>

      {/* ===== CIRCULAR SECTION ===== */}
      <section className={styles.circularSection} id="how-it-works">
        <div className={`${styles.circularWrapper} ${styles.reveal}`}>
          <Image
            src="/circular-element.png"
            alt="NexaLaw assistant circle"
            width={620}
            height={620}
            className={styles.circularImage}
          />
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className={styles.features} id="features">
        <div className={styles.featuresInner}>
          <div className={`${styles.featuresImageCol} ${styles.reveal}`}>
            <Image
              src="/features-image.png"
              alt="Legal scales representing document analysis features"
              width={480}
              height={560}
              className={styles.featuresImage}
            />
          </div>
          <div className={styles.featuresContent}>
            <h2 className={`${styles.featuresTitle} ${styles.reveal}`}>
              Ask questions. Get answers. Understand your legal documents.
            </h2>
            <p className={`${styles.featuresSubtitle} ${styles.reveal}`}>
              Nexalaw makes legal knowledge accessible. Ask anything in plain English
              and get straightforward answers — with or without a document.
            </p>
            <div className={styles.featureGrid}>
              <div className={`${styles.featureCard} ${styles.reveal}`}>
                <div className={styles.featureIcon}>
                  <MessageSquareText size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3 className={styles.featureTitle}>Q&amp;A Chat Interface</h3>
                  <p className={styles.featureDescription}>
                    Ask legal questions in everyday language and get plain-English answers.
                  </p>
                </div>
              </div>

              <div className={`${styles.featureCard} ${styles.reveal}`}>
                <div className={styles.featureIcon}>
                  <FileSearch size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3 className={styles.featureTitle}>Document Analysis</h3>
                  <p className={styles.featureDescription}>
                    Upload contracts, NDAs, or agreements for AI-powered clause extraction and risk detection.
                  </p>
                </div>
              </div>

              <div className={`${styles.featureCard} ${styles.reveal}`}>
                <div className={styles.featureIcon}>
                  <ShieldAlert size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3 className={styles.featureTitle}>Risk Detection</h3>
                  <p className={styles.featureDescription}>
                    Automatically flag unusual terms, one-sided obligations, and auto-renewal clauses.
                  </p>
                </div>
              </div>

              <div className={`${styles.featureCard} ${styles.reveal}`}>
                <div className={styles.featureIcon}>
                  <FilePlus2 size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3 className={styles.featureTitle}>Document Generation</h3>
                  <p className={styles.featureDescription}>
                    Generate NDAs, service agreements, and employment contracts customized with your details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className={styles.testimonials} id="testimonials">
        <div className={styles.testimonialsContainer}>

          {/* Section heading — top-left */}
          <h2 className={`${styles.testimonialsHeading} ${styles.reveal}`}>
            A literacy tool.<br />Not a lawyer.
          </h2>

          {/* Bento grid */}
          <div className={styles.bentoGrid}>

            {/* LEFT COL — avatar stack */}
            <div className={`${styles.bentoAvatarStack} ${styles.reveal}`}>
              {/* Orange avatar — square with orange bg */}
              <div className={styles.orangeAvatarBox}>
                <Image
                  src="/orange-avatar.png"
                  alt="Gabriel Scott — Nexalaw user"
                  fill
                  className={styles.orangeAvatarImg}
                  sizes="240px"
                />
              </div>
              {/* Yellow avatar — circular */}
              <div className={styles.yellowAvatarBox}>
                <Image
                  src="/yellow-avatar.png"
                  alt="Benita Anthony — Nexalaw user"
                  fill
                  className={styles.yellowAvatarImg}
                  sizes="240px"
                />
              </div>
            </div>

            {/* MAIN QUOTE CARD */}
            <div className={`${styles.bentoMainCard} ${styles.reveal}`}>
              <span className={styles.bentoQuoteMark}>&ldquo;</span>
              <blockquote className={styles.bentoMainQuote}>
                It turned a 24-page contract into something I could actually understand before my meeting.
              </blockquote>
              <div className={styles.bentoDivider} />
              <div className={styles.bentoAttribution}>
                <span className={styles.bentoName}>Benita Anthony</span>
                <span className={styles.bentoRole}>Startup Founder</span>
              </div>
            </div>

            {/* SIDE QUOTE CARD */}
            <div className={`${styles.bentoSideCard} ${styles.reveal}`}>
              <span className={styles.bentoQuoteMark}>&ldquo;</span>
              <p className={styles.bentoSideQuote}>
                Asked NexaLaw if my landlord could raise rent mid-lease. Got a clear answer in under a minute, in language I actually understood. No legal degree required.
              </p>
              <div className={styles.bentoDivider} />
              <div className={styles.bentoAttribution}>
                <span className={styles.bentoName}>Chelsea Nancy</span>
                <span className={styles.bentoRole}>Business Owner</span>
              </div>
            </div>

            {/* BOTTOM-LEFT SMALL CARD */}
            <div className={`${styles.bentoSmallCard} ${styles.reveal}`}>
              <p className={styles.bentoSmallQuote}>
                &ldquo;Generated an NDA draft in 5 minutes for a client call I had that same afternoon.&rdquo;
              </p>
              <div className={styles.bentoDivider} />
              <div className={styles.bentoAttribution}>
                <span className={styles.bentoName}>Gabriel Scott</span>
                <span className={styles.bentoRole}>Freelancer</span>
              </div>
            </div>

            {/* BOTTOM-RIGHT WIDE CARD */}
            <div className={`${styles.bentoWideCard} ${styles.reveal}`}>
              <p className={styles.bentoWideQuote}>
                &ldquo;Counsel doesn&apos;t replace my lawyer. It just means I walk into that conversation already understanding what&apos;s at stake.&rdquo;
              </p>
              <div className={styles.bentoDivider} />
              <div className={styles.bentoAttribution}>
                <span className={styles.bentoName}>Ben Marcus</span>
                <span className={styles.bentoRole}>Business owner</span>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ===== BOTTOM CTA ===== */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaSectionContent}>
          <h2 className={`${styles.ctaSectionTitle} ${styles.reveal}`}>A literacy tool. Not a lawyer.</h2>
          <p className={`${styles.ctaSectionSubtitle} ${styles.reveal}`}>
            Contracts and other everyday legal documents are intimidating — especially if you don&apos;t have access to an
            attorney. With Nexalaw you can ask in plain English, understand the document, know what the other side&apos;s
            plans are, and know when to seek legal counsel.
          </p>
          <Link href="/auth" className={`${styles.ctaPrimary} ${styles.reveal}`}>
            Get Started
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          {/* Brand col */}
          <div className={`${styles.footerBrand} ${styles.reveal}`}>
            <Link href="/" className={styles.footerLogoLink}>
              <Image
                src="/light-logo.png"
                alt="Nexalaw"
                width={140}
                height={36}
                className={styles.footerLogo}
              />
            </Link>
            <p className={styles.footerTagline}>
              Legal language, made readable. Ask, upload, or draft<br />
              — all in plain English.
            </p>
          </div>

          {/* Nav columns */}
          <div className={`${styles.footerNav} ${styles.reveal}`}>
            <div className={styles.footerNavCol}>
              <span className={styles.footerNavHeading}>Product</span>
              <Link href="/auth" className={styles.footerNavLink}>Ask a question</Link>
              <Link href="/auth" className={styles.footerNavLink}>Upload a Contract</Link>
              <Link href="/auth" className={styles.footerNavLink}>Generate an NDA</Link>
            </div>
            <div className={styles.footerNavCol}>
              <span className={styles.footerNavHeading}>Company</span>
              <Link href="#" className={styles.footerNavLink}>About</Link>
              <Link href="#" className={styles.footerNavLink}>Our Positioning</Link>
              <Link href="#" className={styles.footerNavLink}>Careers</Link>
            </div>
            <div className={styles.footerNavCol}>
              <span className={styles.footerNavHeading}>Documents</span>
              <Link href="#" className={styles.footerNavLinkUnderline}>NDAs</Link>
              <Link href="#" className={styles.footerNavLink}>Service Agreement</Link>
              <Link href="#" className={styles.footerNavLink}>Leases</Link>
            </div>
          </div>
        </div>

        {/* Giant wordmark */}
        <AnimatedWordmark text="NEXALAW" />

        {/* Legal disclaimer */}
        <div className={styles.footerBottom}>
          <p className={styles.footerDisclaimer}>
            &copy; {new Date().getFullYear()} Nexalaw. This is an educational and legal literacy tool.
            It does not constitute legal advice. Consult a qualified legal professional for legal decisions.
          </p>
        </div>
      </footer>
    </div>
  )
}

