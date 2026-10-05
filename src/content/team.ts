import type { ImageMetadata } from 'astro';
import type { Localized } from '@/i18n';

import fathulla from '@/assets/team/fathulla.jpg';
import doniyor from '@/assets/team/doniyor.jpg';
import sabina from '@/assets/team/sabina.jpg';
import azizbek from '@/assets/team/azizbek.jpg';
import jamil from '@/assets/team/jamil.jpg';
import asadbek from '@/assets/team/asadbek.png';
import javlon from '@/assets/team/javlon.jpg';
import vadim from '@/assets/team/vadim.jpg';

export interface TeamMember {
  name: string;
  role: string;
  photo: ImageMetadata;
}

export interface TeamCopy {
  eyebrow: string;
  title: string;
  lead: string;
  more: string;
  /** Phone carousel: region name + prev / next button labels. */
  carousel: { label: string; prev: string; next: string; roledescription: string };
}

export const teamSection: Localized<TeamCopy> = {
  ru: {
    eyebrow: 'Команда',
    title: 'Люди за кодом',
    lead: 'Разработчики, дизайнеры и AI-инженер — команда, которая доводит проекты до результата.',
    more: 'И другие специалисты команды',
    carousel: {
      label: 'Участники команды',
      prev: 'Предыдущий участник',
      next: 'Следующий участник',
      roledescription: 'карусель',
    },
  },
  uz: {
    eyebrow: 'Jamoa',
    title: 'Kod ortidagi insonlar',
    lead: 'Dasturchilar, dizaynerlar va AI-muhandis — loyihalarni natijagacha yetkazadigan jamoa.',
    more: 'Va jamoaning boshqa mutaxassislari',
    carousel: { label: "Jamoa a'zolari", prev: "Oldingi a'zo", next: "Keyingi a'zo", roledescription: 'karusel' },
  },
};

/** Roles are kept in English as on the original site — they are industry titles. */
export const team: TeamMember[] = [
  { name: 'Fathulla', role: 'CEO & Senior Back End Developer', photo: fathulla },
  { name: 'Vadim', role: 'Senior Front End Developer', photo: vadim },
  { name: 'Azizbek', role: 'Senior iOS & Android Developer', photo: azizbek },
  { name: 'Doniyor', role: 'Full Stack Middle Developer', photo: doniyor },
  { name: 'Jamil', role: 'Middle Back End Developer', photo: jamil },
  { name: 'Javlon', role: 'Middle AI Developer', photo: javlon },
  { name: 'Sabina', role: 'UI/UX Designer', photo: sabina },
  { name: 'Asadbek', role: 'Middle Python Developer', photo: asadbek },
];
