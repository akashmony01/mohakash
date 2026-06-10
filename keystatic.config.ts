import { config, fields, collection, singleton } from '@keystatic/core';

// Shared image/file storage — everything uploaded through the CMS lands in
// public/uploads and is referenced by its public path (/uploads/...).
const imageField = (label: string) =>
  fields.image({
    label,
    directory: 'public/uploads',
    publicPath: '/uploads',
  });

// A downloadable file or external link attached to a post.
const resource = fields.object(
  {
    label: fields.text({ label: 'Label' }),
    href: fields.text({ label: 'URL or file path', description: 'External URL or a path under /uploads' }),
    kind: fields.select({
      label: 'Kind',
      options: [
        { label: 'Link', value: 'link' },
        { label: 'PDF', value: 'pdf' },
        { label: 'Code', value: 'code' },
        { label: 'Live', value: 'live' },
        { label: 'Doc', value: 'doc' },
      ],
      defaultValue: 'link',
    }),
  },
  { label: 'Resource' },
);

const navItem = fields.object(
  {
    label: fields.text({ label: 'Label' }),
    href: fields.text({ label: 'URL', description: 'e.g. /projects or /#about' }),
  },
  { label: 'Menu item' },
);

export default config({
  // Local mode edits files in this repo directly — no account, no server.
  storage: { kind: 'local' },
  ui: {
    brand: { name: 'mohakash' },
    navigation: {
      Content: ['blog', 'poetry', 'research', 'projects'],
      Settings: ['general', 'home', 'pages', 'navigation', 'social'],
    },
  },

  collections: {
    blog: collection({
      label: 'Blog',
      path: 'src/content/blog/*',
      slugField: 'title',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({ label: 'Date' }),
        category: fields.select({
          label: 'Category',
          options: [
            { label: 'Building with Claude', value: 'Building with Claude' },
            { label: 'Notes', value: 'Notes' },
            { label: 'Dev', value: 'Dev' },
          ],
          defaultValue: 'Notes',
        }),
        excerpt: fields.text({ label: 'Excerpt', multiline: true }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        cover: imageField('Cover image'),
        resources: fields.array(resource, {
          label: 'Resources',
          itemLabel: (p) => p.fields.label.value || 'Resource',
        }),
        content: fields.markdoc({ label: 'Body', extension: 'md' }),
      },
    }),

    poetry: collection({
      label: 'Poetry',
      path: 'src/content/poetry/*',
      slugField: 'title',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({ label: 'Date' }),
        note: fields.text({ label: 'Note', description: 'Optional context shown with the poem' }),
        content: fields.markdoc({ label: 'Poem', extension: 'md' }),
      },
    }),

    research: collection({
      label: 'Research',
      path: 'src/content/research/*',
      slugField: 'title',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({ label: 'Date' }),
        type: fields.select({
          label: 'Type',
          options: [
            { label: 'Note', value: 'note' },
            { label: 'Paper', value: 'paper' },
            { label: 'Project', value: 'project' },
          ],
          defaultValue: 'note',
        }),
        abstract: fields.text({ label: 'Abstract', multiline: true }),
        pdf: fields.file({ label: 'PDF', directory: 'public/uploads', publicPath: '/uploads' }),
        link: fields.url({ label: 'Source link' }),
        cover: imageField('Cover image'),
        resources: fields.array(resource, {
          label: 'Resources',
          itemLabel: (p) => p.fields.label.value || 'Resource',
        }),
        content: fields.markdoc({ label: 'Body', extension: 'md' }),
      },
    }),

    projects: collection({
      label: 'Projects',
      path: 'src/content/projects/*',
      slugField: 'title',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        summary: fields.text({ label: 'Summary', multiline: true }),
        stack: fields.array(fields.text({ label: 'Technology' }), {
          label: 'Stack',
          itemLabel: (p) => p.value || 'Tech',
        }),
        year: fields.integer({ label: 'Year' }),
        link: fields.url({ label: 'Live link' }),
        repo: fields.url({ label: 'Repository' }),
        featured: fields.checkbox({ label: 'Featured', defaultValue: false }),
        order: fields.integer({ label: 'Order', defaultValue: 0 }),
        cover: imageField('Cover image'),
        resources: fields.array(resource, {
          label: 'Resources',
          itemLabel: (p) => p.fields.label.value || 'Resource',
        }),
        content: fields.markdoc({ label: 'Body', extension: 'md' }),
      },
    }),
  },

  singletons: {
    general: singleton({
      label: 'General',
      path: 'src/data/general',
      format: { data: 'json' },
      schema: {
        email: fields.text({ label: 'Contact email' }),
        defaultTheme: fields.select({
          label: 'Default theme',
          description: 'Which mode new visitors see (until they toggle it themselves).',
          options: [
            { label: 'Dark', value: 'dark' },
            { label: 'Light', value: 'light' },
            { label: 'Match system', value: 'system' },
          ],
          defaultValue: 'dark',
        }),
        portraitLight: imageField('Portrait — light mode'),
        portraitDark: imageField('Portrait — dark mode'),
      },
    }),

    home: singleton({
      label: 'Home page',
      path: 'src/data/home',
      format: { data: 'json' },
      schema: {
        hero: fields.object(
          {
            eyebrow: fields.text({ label: 'Eyebrow', description: 'Small line above the name' }),
            name: fields.text({ label: 'Name' }),
            tagline: fields.text({ label: 'Tagline' }),
            intro: fields.text({ label: 'Intro', multiline: true }),
            ctaLabel: fields.text({ label: 'Button label' }),
          },
          { label: 'Hero' },
        ),
        newsletter: fields.object(
          {
            badge: fields.text({ label: 'Badge' }),
            heading: fields.text({ label: 'Heading' }),
            subtext: fields.text({ label: 'Subtext', multiline: true }),
          },
          { label: 'Newsletter' },
        ),
        about: fields.object(
          {
            eyebrow: fields.text({ label: 'Eyebrow' }),
            heading: fields.text({ label: 'Heading' }),
            paragraphs: fields.array(fields.text({ label: 'Paragraph', multiline: true }), {
              label: 'Paragraphs',
              itemLabel: (p) => p.value.slice(0, 40) || 'Paragraph',
            }),
            facts: fields.array(
              fields.object({
                label: fields.text({ label: 'Label' }),
                value: fields.text({ label: 'Value', multiline: true }),
              }),
              { label: 'Facts', itemLabel: (p) => p.fields.label.value || 'Fact' },
            ),
          },
          { label: 'About' },
        ),
        featured: fields.object(
          {
            heading: fields.text({ label: 'Heading' }),
            tagline: fields.text({ label: 'Tagline' }),
          },
          { label: 'Recent work' },
        ),
      },
    }),

    pages: singleton({
      label: 'Section pages',
      path: 'src/data/pages',
      format: { data: 'json' },
      schema: {
        projects: fields.object(
          { title: fields.text({ label: 'Title' }), intro: fields.text({ label: 'Intro', multiline: true }) },
          { label: 'Projects page' },
        ),
        poetry: fields.object(
          { title: fields.text({ label: 'Title' }), intro: fields.text({ label: 'Intro', multiline: true }) },
          { label: 'Poetry page' },
        ),
        research: fields.object(
          { title: fields.text({ label: 'Title' }), intro: fields.text({ label: 'Intro', multiline: true }) },
          { label: 'Research page' },
        ),
        blog: fields.object(
          { title: fields.text({ label: 'Title' }), intro: fields.text({ label: 'Intro', multiline: true }) },
          { label: 'Blog page' },
        ),
      },
    }),

    navigation: singleton({
      label: 'Navigation',
      path: 'src/data/navigation',
      format: { data: 'json' },
      schema: {
        header: fields.array(navItem, { label: 'Header menu', itemLabel: (p) => p.fields.label.value || 'Item' }),
        footer: fields.array(navItem, { label: 'Footer menu', itemLabel: (p) => p.fields.label.value || 'Item' }),
      },
    }),

    social: singleton({
      label: 'Social links',
      path: 'src/data/social',
      format: { data: 'json' },
      schema: {
        socials: fields.array(
          fields.object({
            label: fields.text({ label: 'Label' }),
            url: fields.url({ label: 'URL' }),
          }),
          { label: 'Social links', itemLabel: (p) => p.fields.label.value || 'Link' },
        ),
      },
    }),
  },
});
