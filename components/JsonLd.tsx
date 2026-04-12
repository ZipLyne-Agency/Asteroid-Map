import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

const FAQ = [
  {
    question: 'What is the Asteroid Impact Simulator?',
    answer:
      'A free tool that lets you pick any place on Earth, choose a real or famous asteroid, and see what would happen if it hit — the crater, the fireball, the shockwave, and more, all shown on a real map.',
  },
  {
    question: 'Is this scientifically accurate?',
    answer:
      'Yes! The math is based on real published science (Collins et al. 2005). But these are estimates for learning and fun — not emergency warnings.',
  },
  {
    question: 'Does it use real asteroid data?',
    answer:
      'It includes famous asteroids like the one that killed the dinosaurs, plus live data from NASA about real asteroids flying near Earth right now.',
  },
  {
    question: 'Is the simulator free?',
    answer:
      'Totally free. It runs right in your browser — no downloads, no sign-ups, no payments.',
  },
  {
    question: 'What asteroid killed the dinosaurs?',
    answer:
      'The Chicxulub impactor — a 12 km (7.5 mile) wide space rock that hit Mexico 66 million years ago. You can simulate it yourself on asteroidmap.com!',
  },
] as const;

export default function JsonLd() {
  const url = getSiteUrl();
  const logoUrl = `${url}/icon.svg`;

  const graph: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${url}/#organization`,
        name: SITE_NAME,
        url,
        logo: { '@type': 'ImageObject', url: logoUrl },
      },
      {
        '@type': 'WebSite',
        '@id': `${url}/#website`,
        name: SITE_NAME,
        url,
        description: SITE_DESCRIPTION,
        publisher: { '@id': `${url}/#organization` },
        inLanguage: 'en-US',
      },
      {
        '@type': 'WebPage',
        '@id': `${url}/#webpage`,
        url,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        isPartOf: { '@id': `${url}/#website` },
        about: { '@id': `${url}/#software` },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${url}/#software`,
        name: SITE_NAME,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        browserRequirements: 'Requires JavaScript. Modern browser with WebGL recommended for the map.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: SITE_DESCRIPTION,
        url,
        author: { '@id': `${url}/#organization` },
        featureList: [
          'Interactive world map with impact rings (crater, fireball, blast, thermal)',
          'Asteroid parameters: diameter, velocity, composition',
          'Energy, seismic magnitude, and rough casualty estimates by population density',
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}/#faq`,
        mainEntity: FAQ.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
