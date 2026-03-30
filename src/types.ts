export interface Registration {
  id?: string;
  mandal: string;
  name: string;
  phone: string;
  arrivalDate: string;
  guestCount: number;
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
  createdAt: string;
}

export const MANDALS = [
  "Shree Swaminarayan Mandal",
  "Nishkham Seva Mandal",
  "Bhakti Seva Mandal",
  "Satsang Mandal",
  "Dharma Seva Mandal"
];
