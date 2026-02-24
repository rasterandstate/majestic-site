import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Majestic Core',
  description: 'Technical documentation — architecture, API contracts, invariants',
  base: '/',
  lang: 'en-US',

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Overview', link: '/overview' },
      { text: 'Architecture', link: '/architecture/' },
      { text: 'Contracts', link: '/contracts/' },
      { text: 'Integration', link: '/integration/' },
      { text: 'Invariants', link: '/invariants/' },
    ],

    sidebar: {
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Identity Layer', link: '/architecture/identity-layer' },
            { text: 'API Layer', link: '/architecture/api-layer' },
            { text: 'Build Layer', link: '/architecture/build-layer' },
            { text: 'Streaming Model', link: '/architecture/streaming-model' },
            { text: 'Data Lineage', link: '/architecture/data-lineage' },
            { text: 'Data Contracts', link: '/architecture/data-contracts' },
          ],
        },
      ],
      '/contracts/': [
        {
          text: 'Contracts',
          items: [
            { text: 'Reference', link: '/contracts/' },
            { text: 'Versioning', link: '/versioning/contract-versioning' },
          ],
        },
      ],
      '/integration/': [
        {
          text: 'Integration',
          items: [
            { text: 'Client Integration', link: '/integration/' },
          ],
        },
      ],
      '/invariants/': [
        {
          text: 'Invariants & Governance',
          items: [
            { text: 'Breaking Changes', link: '/invariants/breaking-changes' },
            { text: 'Compatibility Policy', link: '/invariants/compatibility-policy' },
          ],
        },
      ],
    },

    socialLinks: [],
    footer: {
      message: 'Contract version and hash embedded at build time.',
      copyright: 'Majestic — local-first, identity-driven media server.',
    },

    outline: [2, 3],
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'min-dark',
    },
  },

  ignoreDeadLinks: true, // Source docs may reference internal links
});
