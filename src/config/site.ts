// Contact + social links, sourced from CMS-editable data files
// (src/data/general.json, src/data/social.json). Edit in the CMS
// (npm run cms → /keystatic) or directly.
import general from '../data/general.json';
import social from '../data/social.json';

export const email = general.email;

export interface SocialLink {
  label: string;
  url: string;
}

export const socials: SocialLink[] = social.socials;
