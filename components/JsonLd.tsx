import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

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
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
