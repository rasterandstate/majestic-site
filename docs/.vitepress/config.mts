import { defineConfig } from 'vitepress';

// GitHub Pages project site: base = /majestic-site/
// Custom domain (majesticcore.dev): set BASE_PATH=/ in workflow env
let base = process.env.BASE_PATH || '/majestic-site/';
if (base !== '/' && !base.endsWith('/')) base += '/';

export default defineConfig({
  title: 'Majestic Core',
  description: 'Technical documentation: architecture, API contracts, invariants',
  base,
  lang: 'en-US',

  head: [
    ['link', { rel: 'icon', href: `${base === '/' ? '/' : base}logo.svg`, type: 'image/svg+xml' }],
  ],

  appearance: 'force-dark', // Match Svelte app (dark only, no toggle)

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Overview', link: '/overview' },
      { text: 'Architecture', link: '/architecture/' },
      { text: 'Contracts', link: '/contracts/' },
      { text: 'Integration', link: '/integration/' },
      { text: 'Invariants', link: '/invariants/' },
      { text: 'Operations', link: '/operations/deployment' },
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
            { text: 'Roku Contract Alignment', link: '/integration/roku-contract-alignment' },
            { text: 'Streaming Platforms', link: '/integration/streaming-platforms' },
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
      '/compatibility/': [
        {
          text: 'Compatibility',
          items: [
            { text: 'Apple TV Format Support', link: '/compatibility/apple-tv-format-support' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Terminology', link: '/reference/TERMINOLOGY' },
          ],
        },
      ],
      '/validation/': [
        {
          text: 'Validation',
          items: [
            { text: 'Soak Testing', link: '/validation/soak-testing' },
            { text: 'Concurrency', link: '/validation/concurrency' },
            { text: 'Crash Recovery', link: '/validation/crash-recovery' },
          ],
        },
      ],
      '/operations/': [
        {
          text: 'Operations',
          items: [
            { text: 'Deployment', link: '/operations/deployment' },
          ],
        },
      ],
    },

    socialLinks: [],
    footer: {
      message: 'Contract version and hash embedded at build time.',
      copyright: 'Built from canonical contract bundle.',
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
