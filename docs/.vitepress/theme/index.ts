import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';

// Build meta written by prepare.mjs — import path relative to theme
// @ts-expect-error JSON import
import buildMeta from '../build-meta.json';

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () =>
        h('div', {
          class: 'build-meta-footer',
          style: {
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--vp-c-divider)',
            textAlign: 'center',
          },
          innerHTML: `
            <p style="font-size: 0.75rem; color: var(--vp-c-text-3); margin: 0;">
              Contract: ${(buildMeta as { contractVersion?: string }).contractVersion || '—'} · Hash: ${(buildMeta as { schemaHash?: string }).schemaHash || '—'} · Built: ${(buildMeta as { buildTime?: string }).buildTime || '—'}
            </p>
          `,
        }),
    });
  },
};
