import { getCollection, type CollectionEntry } from 'astro:content';

export type DocEntry = CollectionEntry<'docs'>;

export interface DocNavItem {
  title: string;
  slug: string;
  href: string;
  order: number;
}

export interface VersionedNav {
  version: string;
  items: DocNavItem[];
}

/** All available doc versions, sorted descending (latest first). */
export async function getVersions(): Promise<string[]> {
  const entries = await getCollection('docs');
  const versions = Array.from(new Set(entries.map((e) => e.slug.split('/')[0])));
  return versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
}

/** The latest version string. */
export async function getLatestVersion(): Promise<string> {
  const versions = await getVersions();
  return versions[0];
}

/** All docs for a specific version, sorted by order then title. */
export async function getDocsForVersion(version: string): Promise<DocEntry[]> {
  const entries = await getCollection('docs');
  return entries
    .filter((e) => e.slug.startsWith(`${version}/`))
    .sort((a, b) => {
      const orderDiff = (a.data.order ?? 0) - (b.data.order ?? 0);
      return orderDiff !== 0 ? orderDiff : a.data.title.localeCompare(b.data.title);
    });
}

/** Build navigation items for a version with correct hrefs. */
export async function getNavForVersion(version: string, base: string): Promise<DocNavItem[]> {
  const docs = await getDocsForVersion(version);
  return docs.map((doc) => {
    const [, ...rest] = doc.slug.split('/');
    const pageSlug = rest.join('/');
    return {
      title: doc.data.title,
      slug: pageSlug,
      href: `${base}/docs/${version}/${pageSlug}`,
      order: doc.data.order ?? 0,
    };
  });
}

/** Extract version and page slug from a full doc slug like "v0.1/hello-world". */
export function splitDocSlug(fullSlug: string): { version: string; pageSlug: string } {
  const [version, ...rest] = fullSlug.split('/');
  return { version, pageSlug: rest.join('/') };
}
