import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

const FAQ = [
  {
    question: 'What is the Asteroid Impact Simulator?',
    answer:
      'A free educational tool that lets you pick any place on Earth, choose a real or famous asteroid, and see first-order modeled effects such as airburst or crater, fireball, shockwave, and thermal zones on a map.',
  },
  {
    question: 'Is this scientifically accurate?',
    answer:
      'It uses published first-order impact-effect scaling, including Collins et al. 2005, but results are educational estimates with large uncertainty — not emergency forecasts.',
  },
  {
    question: 'Does it use real asteroid data?',
    answer:
      'It includes famous asteroids and live NASA/JPL close-approach records. Those records are flybys, not predicted impacts, and some object sizes are estimates.',
  },
  {
    question: 'Is the simulator free?',
    answer:
      'Totally free. It runs right in your browser — no downloads, no sign-ups, no payments.',
  },
  {
    question: 'What asteroid killed the dinosaurs?',
    answer:
      'The Chicxulub impactor — a roughly 10-12 km wide space rock associated with the impact near Mexico 66 million years ago.',
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
          'Interactive world map with impact rings (airburst or crater, fireball, blast, window damage, thermal)',
          'Curated and NASA/JPL asteroid inputs with diameter, velocity, composition, and target-material assumptions',
          'Energy, seismic energy equivalent, and uncertainty-expanded uniform-density population-exposure ranges',
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
