import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Shield, Cookie, RefreshCw, AlertCircle, BookOpen, ChevronRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

/* ─────────────────────────────────────────────────────────────────────────
   Shared shell used by all legal pages.
   Accepts { title, icon, badge, lastUpdated, children }.
   ──────────────────────────────────────────────────────────────────────── */
const LegalShell = ({ title, icon: Icon = FileText, badge, lastUpdated, description, children }) => (
  <>
    <title>{title} | Rentora</title>
    <meta name="description" content={description} />

    <div style={{ minHeight: '100vh', background: 'var(--bg-color)', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)',
        background: 'var(--header-bg)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.3rem', color: 'var(--primary-color)' }}>
            Rentora
          </span>
        </Link>
        <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem' }}>Terms</Link>
          <Link to="/rental-policy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem' }}>Rental &amp; Return</Link>
          <Link to="/refund-policy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem' }}>Refunds</Link>
          <Link to="/owner-policy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem' }}>Owner Policy</Link>
          <Link to="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem' }}>Privacy</Link>
          <Link to="/cookies" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem' }}>Cookies</Link>
          <Link to="/faq" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem' }}>FAQ</Link>
          <ThemeToggle />
        </nav>
      </header>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(226,55,68,0.06) 0%, rgba(249,115,22,0.04) 100%)',
        borderBottom: '1px solid var(--border-color)',
        padding: '3rem 2rem 2.5rem'
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, flexShrink: 0,
            background: 'rgba(226, 55, 68, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon size={30} color="var(--primary-color)" strokeWidth={1.7} />
          </div>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(226,55,68,0.08)', borderRadius: 50,
              padding: '0.25rem 0.9rem', marginBottom: '0.6rem'
            }}>
              <span style={{ color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 700 }}>{badge}</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              {title}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Last updated: <strong>{lastUpdated}</strong> · Questions?{' '}
              <Link to="/contact" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>Contact us</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '3rem 2rem' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        background: 'var(--surface-color)',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {[
            { to: '/terms', label: 'Terms of Service' },
            { to: '/rental-policy', label: 'Rental & Return Policy' },
            { to: '/refund-policy', label: 'Refund Policy' },
            { to: '/owner-policy', label: 'Owner Policy' },
            { to: '/privacy', label: 'Privacy Policy' },
            { to: '/cookies', label: 'Cookie Policy' },
            { to: '/contact', label: 'Contact' },
          ].map(({ to, label }) => (
            <Link key={to} to={to} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem' }}>
              {label}
            </Link>
          ))}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          © {new Date().getFullYear()} Rentora Technologies Pvt. Ltd. All rights reserved. CIN: U74999MH2024PTC000001
        </p>
      </footer>
    </div>
  </>
);

/* ─────────────────────────────────────────────────────────────────────────
   Section helper
   ──────────────────────────────────────────────────────────────────────── */
const Section = ({ title, children }) => (
  <section style={{ marginBottom: '2.5rem' }}>
    <h2 style={{
      fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)',
      marginBottom: '0.75rem', paddingBottom: '0.5rem',
      borderBottom: '2px solid var(--primary-color)', display: 'inline-block'
    }}>
      {title}
    </h2>
    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.92rem' }}>
      {children}
    </div>
  </section>
);

const P = ({ children }) => <p style={{ marginBottom: '0.75rem' }}>{children}</p>;
const UL = ({ items }) => (
  <ul style={{ paddingLeft: '1.4rem', marginBottom: '0.75rem' }}>
    {items.map((it, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{it}</li>)}
  </ul>
);

/* ─────────────────────────────────────────────────────────────────────────
   1. TERMS OF SERVICE
   ──────────────────────────────────────────────────────────────────────── */
export const TermsPage = () => (
  <LegalShell
    title="Terms of Service"
    icon={FileText}
    badge="LEGAL"
    lastUpdated="October 2026"
    description="Read Rentora's Terms of Service before renting furniture and appliances."
  >
    <Section title="1. Acceptance of Terms">
      <P>By accessing or using the Rentora platform (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you must not use the Service. These Terms apply to all visitors, customers, owners, and other users of the platform.</P>
    </Section>
    <Section title="2. Eligibility">
      <P>You must be at least 18 years old and capable of entering a legally binding contract to use Rentora. By using the Service, you represent and warrant that you meet these requirements.</P>
    </Section>
    <Section title="3. User Accounts">
      <UL items={[
        'You are responsible for maintaining the confidentiality of your account credentials.',
        'You must provide accurate, current, and complete information during registration.',
        'You must notify us immediately of any unauthorised use of your account.',
        'Each user may maintain only one personal account. Multiple accounts may be suspended.',
      ]} />
    </Section>
    <Section title="4. Rental Agreement & Tenure Tiers">
      <P>Each rental constitutes a separate digital agreement between the Customer and Rentora. Rentals are subject to availability, mandatory KYC verification, and payment of the applicable security deposit (1.5× monthly rent). The rental period begins upon delivery confirmation and ends on the agreed return date.</P>
      <UL items={[
        'Standard tenure plans: 3-month, 6-month, and 12-month commitments with tiered monthly discounts.',
        'Early termination is subject to an early-exit fee as stated in our Refund Policy.',
        'Late return penalty: ₹50/day beyond the scheduled return or billing due date.',
        'Rentora Shield covers minor and moderate accidental wear up to ₹10,000 with ₹0 deposit deduction.',
        'Severe damage beyond normal wear and the ₹10,000 Shield limit is deducted from the security deposit with photo evidence.',
        'Rent-to-Own option: 70% of accumulated monthly rent accrues as buyout equity.',
      ]} />
    </Section>
    <Section title="5. Payments & Billing">
      <P>Rental fees are billed monthly in advance. Security deposits are refunded within 5–7 business days after successful return inspection. Payments are processed via PCI-DSS compliant gateways. All prices are inclusive of applicable GST.</P>
    </Section>
    <Section title="6. Prohibited Conduct">
      <UL items={[
        'Sub-letting or transferring rented items to third parties.',
        'Using products for commercial purposes unless on a Business plan.',
        'Tampering with serial numbers, seals, or product identifiers.',
        'Providing false KYC documents.',
        'Reverse-engineering, scraping, or abusing the Rentora API.',
      ]} />
    </Section>
    <Section title="7. Limitation of Liability">
      <P>To the maximum extent permitted by law, Rentora's total liability shall not exceed the rental fees paid by you in the 12 months preceding the claim. Rentora shall not be liable for indirect, incidental, or consequential damages.</P>
    </Section>
    <Section title="8. Governing Law">
      <P>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra. For consumer disputes, you may also approach the appropriate consumer forum.</P>
    </Section>
    <Section title="9. Changes to Terms">
      <P>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance. We will notify registered users by email of material changes at least 14 days in advance.</P>
    </Section>
    <Section title="10. Contact">
      <P>For questions about these Terms, email <a href="mailto:legal@rentora.in" style={{ color: 'var(--primary-color)' }}>legal@rentora.in</a> or visit our <Link to="/contact" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>Contact page</Link>.</P>
    </Section>
  </LegalShell>
);

/* ─────────────────────────────────────────────────────────────────────────
   2. PRIVACY POLICY
   ──────────────────────────────────────────────────────────────────────── */
export const PrivacyPage = () => (
  <LegalShell
    title="Privacy Policy"
    icon={Shield}
    badge="PRIVACY"
    lastUpdated="October 2026"
    description="Learn how Rentora collects, uses, and protects your personal data."
  >
    <Section title="1. Data We Collect">
      <P>We collect the following categories of personal information:</P>
      <UL items={[
        'Identity data: name, email, phone number, government-issued ID (for KYC).',
        'Account data: username, password hash, role, registration timestamp.',
        'Transactional data: rental history, payments, invoices, escrow records.',
        'Device & usage data: IP address, browser type, pages visited, session duration.',
      ]} />
    </Section>
    <Section title="2. How We Use Your Data">
      <UL items={[
        'To provide, operate, and improve the Rentora Service.',
        'To verify your identity (KYC) and prevent fraud.',
        'To process payments, generate invoices, and manage escrow.',
        'To send transactional emails, rental reminders, and service notifications.',
        'To power our AI churn-risk and predictive-maintenance models (anonymised).',
        'To comply with legal obligations under Indian law.',
      ]} />
    </Section>
    <Section title="3. Data Sharing">
      <P>We do not sell your personal data. We may share data with:</P>
      <UL items={[
        'Payment processors (Razorpay, Stripe) for secure payment handling.',
        'Logistics partners for delivery and pickup scheduling.',
        'Government authorities when required by law (e.g., court order, GST audit).',
        'Cloud infrastructure providers (data processed within India).',
      ]} />
    </Section>
    <Section title="4. Data Retention">
      <P>We retain personal data for as long as your account is active, plus 7 years for financial records as required by the Companies Act, 2013. KYC documents are retained for 5 years post account closure per RBI guidelines.</P>
    </Section>
    <Section title="5. Your Rights">
      <P>Under the Digital Personal Data Protection Act, 2023 (DPDP Act), you have the right to:</P>
      <UL items={[
        'Access the personal data we hold about you.',
        'Correct inaccurate or incomplete data.',
        'Request erasure ("right to be forgotten") subject to legal retention obligations.',
        'Withdraw consent for marketing communications at any time.',
        'Nominate a successor for your data in the event of your death.',
      ]} />
      <P>To exercise any right, email <a href="mailto:privacy@rentora.in" style={{ color: 'var(--primary-color)' }}>privacy@rentora.in</a>. We respond within 30 days.</P>
    </Section>
    <Section title="6. Security">
      <P>We implement industry-standard security: TLS 1.3 in transit, AES-256 at rest, bcrypt password hashing, and role-based access control. We conduct regular vulnerability assessments and penetration tests.</P>
    </Section>
    <Section title="7. Grievance Officer">
      <P>In accordance with the Information Technology Act, 2000, our Grievance Officer is: <strong>Rahul Sharma</strong>, Rentora Technologies Pvt. Ltd., 1st Floor, Oberoi Commerz, Goregaon East, Mumbai – 400063. Email: <a href="mailto:grievance@rentora.in" style={{ color: 'var(--primary-color)' }}>grievance@rentora.in</a>.</P>
    </Section>
  </LegalShell>
);

/* ─────────────────────────────────────────────────────────────────────────
   3. COOKIE POLICY
   ──────────────────────────────────────────────────────────────────────── */
export const CookiesPage = () => (
  <LegalShell
    title="Cookie Policy"
    icon={Cookie}
    badge="COOKIES"
    lastUpdated="October 2026"
    description="Understand how Rentora uses cookies and similar tracking technologies."
  >
    <Section title="1. What Are Cookies?">
      <P>Cookies are small text files stored on your device when you visit a website. They help us remember your preferences and understand how you use our platform.</P>
    </Section>
    <Section title="2. Types of Cookies We Use">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', marginBottom: '0.75rem' }}>
        <thead>
          <tr style={{ background: 'var(--surface-muted)' }}>
            {['Type', 'Purpose', 'Duration'].map(h => (
              <th key={h} style={{ padding: '0.6rem 0.8rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ['Essential', 'Authentication tokens, CSRF protection, session management', 'Session / 24h'],
            ['Preference', 'Theme (dark/light), selected city, language', '1 year'],
            ['Analytics', 'Page views, funnel tracking (anonymous), error logging', '90 days'],
            ['Marketing', 'Retargeting (opt-in only), promo attribution', '30 days'],
          ].map(([type, purpose, duration], i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{type}</td>
              <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-secondary)' }}>{purpose}</td>
              <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-secondary)' }}>{duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
    <Section title="3. Managing Cookies">
      <P>You can control cookies via your browser settings. Disabling essential cookies will prevent login and core functionality. You can opt out of marketing cookies at any time from your Account → Privacy settings.</P>
    </Section>
    <Section title="4. Third-Party Cookies">
      <P>Analytics tools (Google Analytics) and payment processors may set their own cookies. We do not control these and encourage you to review their respective privacy policies.</P>
    </Section>
  </LegalShell>
);

/* ─────────────────────────────────────────────────────────────────────────
   4. REFUND POLICY
   ──────────────────────────────────────────────────────────────────────── */
export const RefundPolicyPage = () => (
  <LegalShell
    title="Refund Policy"
    icon={RefreshCw}
    badge="REFUNDS"
    lastUpdated="October 2026"
    description="Rentora's refund, cancellation, and security deposit return policy."
  >
    <Section title="1. Security Deposit Refund">
      <P>The security deposit (1.5× the monthly rent, held in segregated escrow) is fully refundable after your rental ends, subject to a successful return inspection and settlement of any ₹50/day late fees. Refund timeline:</P>
      <UL items={[
        'Credit card / UPI: 5–7 business days after inspection clearance.',
        'Bank transfer (NEFT): 3–5 business days.',
        'Wallet / coupon credit: within 24 hours.',
      ]} />
    </Section>
    <Section title="2. Cancellation Before Delivery">
      <P>If you cancel your order before the scheduled delivery slot:</P>
      <UL items={[
        'Cancelled 48+ hours before delivery: 100% refund.',
        'Cancelled 12–48 hours before delivery: 90% refund (10% logistics fee).',
        'Cancelled less than 12 hours before delivery: 70% refund.',
      ]} />
    </Section>
    <Section title="3. Early Termination">
      <P>Terminating a rental before the agreed period attracts an early-exit fee:</P>
      <UL items={[
        '1-month plan: 1 month\'s rent as exit fee.',
        '3-month plan: 0.5 month\'s rent as exit fee.',
        '6-month+ plan: No exit fee after 3 months of usage.',
      ]} />
    </Section>
    <Section title="4. Damage Deductions & Rentora Shield">
      <P>All rentals include Rentora Shield, providing up to ₹10,000 accidental damage protection for minor and moderate wear (₹0 deposit deduction). Severe structural damage beyond normal wear is assessed against the security deposit with photo evidence and human review. Disputes can be raised within 7 days via My Rentals.</P>
    </Section>
    <Section title="5. Swap / Exchange Policy">
      <P>Under the ExperienceSwap feature, one free swap per 6-month tenure is provided. Additional swaps incur a ₹499 logistics fee. Refunds for price-difference swaps are credited as Rentora wallet credits within 48 hours.</P>
    </Section>
    <Section title="6. Non-Refundable Items">
      <UL items={[
        'Platform convenience fee (₹99 one-time).',
        'KYC verification fee (if applicable).',
        'Express delivery surcharge.',
      ]} />
    </Section>
    <Section title="7. How to Request a Refund">
      <P>To initiate a refund, go to <strong>My Rentals → Raise a Dispute</strong> or email <a href="mailto:support@rentora.in" style={{ color: 'var(--primary-color)' }}>support@rentora.in</a> with your Order ID and reason. All refunds are processed within the timelines above once verified.</P>
    </Section>
  </LegalShell>
);

/* ─────────────────────────────────────────────────────────────────────────
   5. FAQ PAGE
   ──────────────────────────────────────────────────────────────────────── */
const FAQ_ITEMS = [
  {
    q: 'How does Rentora work?',
    a: 'Browse our catalog, add products to your cart, choose a rental tenure (1–24 months), pay the security deposit + first month\'s rent, and we\'ll deliver to your doorstep within 2–5 business days.'
  },
  {
    q: 'Is KYC mandatory?',
    a: 'Yes. To protect our owner-partners and comply with RBI guidelines, all customers must complete a one-time KYC using their Aadhaar or PAN before the first delivery.'
  },
  {
    q: 'What if a product breaks down?',
    a: 'All appliances come with a free maintenance SLA. Log a service request in My Rentals and we\'ll send a technician within 48 hours on weekdays, at no extra cost to you.'
  },
  {
    q: 'Can I buy the product I\'m renting?',
    a: 'Yes! Our Rent-to-Own feature lets you apply rental payments towards ownership. Check the "Buy Out" tab on any product in My Rentals to see the buyout price.'
  },
  {
    q: 'How is the security deposit calculated?',
    a: 'The deposit equals 1.5× the monthly rent (held in segregated escrow) and is fully refundable within 5–7 business days after the product is picked up and inspected.'
  },
  {
    q: 'Can I swap to a different product mid-tenure?',
    a: 'Yes. The ExperienceSwap feature lets you swap once per 6 months for free. Go to My Rentals → Swap Product and select your new choice.'
  },
  {
    q: 'What cities does Rentora operate in?',
    a: 'We currently serve Mumbai, Pune, Bangalore, Delhi NCR, Chennai, Hyderabad, Kolkata, and Ahmedabad. We\'re expanding rapidly — enter your pincode to check availability.'
  },
  {
    q: 'Is my payment data secure?',
    a: 'Yes. All payments are processed via PCI-DSS Level 1 certified gateways. Rentora never stores your raw card data.'
  },
  {
    q: 'Can businesses / offices rent on Rentora?',
    a: 'Absolutely. Our Business plan includes GST invoicing, dedicated account manager, bulk discounts, and priority maintenance SLA. Contact us at enterprise@rentora.in.'
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'Go to My Rentals → Cancel Subscription. Early-exit fees may apply depending on your plan. Check our Refund Policy for details.'
  },
];

export const FAQPage = () => {
  const [open, setOpen] = useState(null);

  return (
    <LegalShell
      title="Frequently Asked Questions"
      icon={BookOpen}
      badge="FAQ"
      lastUpdated="October 2026"
      description="Find answers to common questions about Rentora's rental service, KYC, payments, and more."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: 14, overflow: 'hidden',
              background: open === i ? 'var(--surface-color)' : 'var(--surface-muted)',
              transition: 'all 0.2s'
            }}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 1.25rem', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left', gap: '1rem'
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                {item.q}
              </span>
              <ChevronRight
                size={18}
                color="var(--text-muted)"
                style={{ flexShrink: 0, transform: open === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
              />
            </button>
            {open === i && (
              <div style={{
                padding: '0 1.25rem 1.25rem',
                color: 'var(--text-secondary)', lineHeight: 1.75, fontSize: '0.92rem'
              }}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '2.5rem', background: 'var(--surface-color)',
        border: '1px solid var(--border-color)', borderRadius: 16,
        padding: '1.75rem', textAlign: 'center'
      }}>
        <AlertCircle size={28} color="var(--primary-color)" style={{ marginBottom: '0.75rem' }} />
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Still have questions?
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.92rem' }}>
          Our support team is available 7 days a week, 9 AM – 9 PM IST.
        </p>
        <Link
          to="/contact"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.7rem 1.5rem', borderRadius: 10,
            background: 'var(--primary-color)', color: '#fff',
            textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem'
          }}
        >
          Contact Support <ChevronRight size={16} />
        </Link>
      </div>
    </LegalShell>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   6. CONTACT PAGE
   ──────────────────────────────────────────────────────────────────────── */
export const ContactPage = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate submission (replace with real API call)
    await new Promise(r => setTimeout(r, 1200));
    setSent(true);
    setLoading(false);
  };

  return (
    <LegalShell
      title="Contact Us"
      icon={AlertCircle}
      badge="SUPPORT"
      lastUpdated="October 2026"
      description="Get in touch with Rentora's customer support team."
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {[
          { label: 'Customer Support', value: 'support@rentora.in', type: 'email', sub: 'Mon–Sun · 9 AM – 9 PM IST' },
          { label: 'Business / Enterprise', value: 'enterprise@rentora.in', type: 'email', sub: 'Mon–Fri · 10 AM – 6 PM IST' },
          { label: 'Grievance Officer', value: 'grievance@rentora.in', type: 'email', sub: 'Respond within 30 days' },
          { label: 'Registered Office', value: '1st Floor, Oberoi Commerz, Goregaon East, Mumbai – 400063', type: 'address', sub: 'CIN: U74999MH2024PTC000001' },
        ].map(({ label, value, type, sub }) => (
          <div key={label} style={{
            background: 'var(--surface-color)', border: '1px solid var(--border-color)',
            borderRadius: 14, padding: '1.25rem'
          }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              {label}
            </p>
            {type === 'email' ? (
              <a href={`mailto:${value}`} style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}>
                {value}
              </a>
            ) : (
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{value}</span>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{sub}</p>
          </div>
        ))}
      </div>

      {sent ? (
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 16, padding: '2rem', textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
          <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Message Sent!
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            We'll get back to you at <strong>{form.email}</strong> within 24 hours.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{
          background: 'var(--surface-color)', border: '1px solid var(--border-color)',
          borderRadius: 16, padding: '2rem'
        }}>
          <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Send a Message</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {[
              { name: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
              { name: 'email', label: 'Email Address', type: 'email', placeholder: 'john@example.com' },
            ].map(({ name, label, type, placeholder }) => (
              <div key={name}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  {label}
                </label>
                <input
                  type={type}
                  required
                  placeholder={placeholder}
                  value={form[name]}
                  onChange={e => setForm({ ...form, [name]: e.target.value })}
                  style={{
                    width: '100%', padding: '0.7rem 0.9rem', borderRadius: 10,
                    border: '1px solid var(--border-color)', background: 'var(--surface-muted)',
                    color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Subject</label>
            <input
              type="text"
              required
              placeholder="e.g. Refund query for Order #R-20945"
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              style={{
                width: '100%', padding: '0.7rem 0.9rem', borderRadius: 10,
                border: '1px solid var(--border-color)', background: 'var(--surface-muted)',
                color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Message</label>
            <textarea
              required
              rows={5}
              placeholder="Describe your issue in detail..."
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              style={{
                width: '100%', padding: '0.7rem 0.9rem', borderRadius: 10,
                border: '1px solid var(--border-color)', background: 'var(--surface-muted)',
                color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.8rem 2rem', borderRadius: 12,
              background: loading ? 'var(--border-color)' : 'var(--primary-color)',
              color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      )}
    </LegalShell>
  );
};


/* ─────────────────────────────────────────────────────────────────────────
   7. RENTAL & RETURN POLICY PAGE
   ──────────────────────────────────────────────────────────────────────── */
export const RentalPolicyPage = () => (
  <LegalShell
    title="Rental & Return Policy"
    icon={RefreshCw}
    badge="RENTAL POLICY"
    lastUpdated="November 2026"
    description="Detailed policy for appliance delivery, condition grades, Rentora Shield waiver, returns, and Rent-to-Own buyouts."
  >
    <Section title="1. Tenure Plans & Security Deposit">
      <P>Rentora offers 3-month, 6-month, and 12-month subscription plans with progressive monthly discounts. Every order requires a refundable security deposit equal to 1.5× the monthly rent, held in segregated escrow custody.</P>
    </Section>
    <Section title="2. Delivery, Handover OTP & Inspection">
      <UL items={[
        'Mandatory KYC verification must be completed prior to checkout.',
        'At doorstep delivery, verify appliance serial number and condition with a 4-digit handover OTP.',
        'Condition grades (GRADE_A_PLUS, GRADE_A, GRADE_B) and age-adjusted pricing are transparently tracked per serialized unit.',
      ]} />
    </Section>
    <Section title="3. Rentora Shield (₹10,000 Damage Waiver)">
      <P>Every active lease includes Rentora Shield accidental damage protection up to ₹10,000:</P>
      <UL items={[
        'MINOR and MODERATE accidental wear (scuffs, minor electrical surges, normal wear) incur ₹0 deposit deduction.',
        'SEVERE structural damage beyond the ₹10,000 waiver requires photo evidence and human review before any deposit deduction.',
        'Late returns beyond the agreed date or billing cycle incur a ₹50/day late fee.',
      ]} />
    </Section>
    <Section title="4. 4-Stage Return & Refurbishment Workflow">
      <P>Returned appliances go through a documented 4-stage recovery pipeline before restocking:</P>
      <UL items={[
        'Stage 1 (RETURN_INSPECTION): Diagnostic return intake and damage audit (1 day).',
        'Stage 2 (SANITIZATION_PART_REPLACE): High-temp steam sanitization and filter/gasket refresh (2 days).',
        'Stage 3 (QUALITY_AUDIT_28PT): 28-point electrical and safety certification (1 day).',
        'Stage 4 (RESTOCKED_AVAILABLE): Certified unit restocked to active warehouse fleet.',
      ]} />
    </Section>
    <Section title="5. Rent-to-Own Buyout Equity">
      <P>70% of your accumulated monthly rental payments accrue as equity toward outright purchase. At buyout, your held security deposit is applied toward the residual balance (minimum residual ₹500 + applicable GST), and a Digital Certificate of Ownership is issued.</P>
    </Section>
  </LegalShell>
);

/* ─────────────────────────────────────────────────────────────────────────
   8. PEER-TO-PEER OWNER & LESSOR POLICY PAGE
   ──────────────────────────────────────────────────────────────────────── */
export const OwnerPolicyPage = () => (
  <LegalShell
    title="Owner & Lessor Policy"
    icon={Shield}
    badge="OWNER POLICY"
    lastUpdated="November 2026"
    description="Terms and compensation rules for peer-to-peer appliance owners listing inventory on Rentora."
  >
    <Section title="1. Asset Eligibility & Onboarding">
      <P>Peer owners may list household appliances and furniture that pass Rentora's 28-point safety and functional inspection. Each onboarded asset receives a serialized unit ID and depot assignment.</P>
    </Section>
    <Section title="2. Depreciation-Aware Pricing & Payouts">
      <P>Monthly rental rates and deposits are calibrated by condition grade (GRADE_A_PLUS: 100%, GRADE_A: 90%, GRADE_B: 78%) and asset age to balance customer affordability with sustainable owner ROI.</P>
    </Section>
    <Section title="3. Maintenance, Refurbishment & Liability">
      <UL items={[
        'Rentora coordinates preventive maintenance, refurbishment between leases, and technician dispatch.',
        'Minor and moderate customer wear is absorbed under Rentora Shield (up to ₹10,000) without penalizing owners.',
        'Disputed severe damage cases are escalated to the human-review audit queue with intake and return photo evidence.',
      ]} />
    </Section>
    <Section title="4. Settlement & Retirement">
      <P>Owner payouts are settled monthly after rent collection. When an asset reaches end-of-life or high cumulative ROI with Grade-B wear, Rentora notifies the owner to evaluate refurbishment, buyout, or retirement.</P>
    </Section>
  </LegalShell>
);
