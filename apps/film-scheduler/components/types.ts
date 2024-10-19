export interface Film {
  id: string;
  filmTitle: string;
  schedule: { date: string; time: string; location: string }[];
  synopsis: string;
}
