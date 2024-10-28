import { Film, RawFilm } from "@/components/types";
import filmsData from "../data/filmsData.json";
import { generateSessionId } from "@/lib/utils";

function transformFilm([id, rawFilm]: [string, RawFilm]): Film {
  const { schedule, duration, ...rest } = rawFilm;
  return {
    ...rest,
    id,
    schedule: schedule.map((sch) => {
      const partialSession = {
        filmId: id,
        time: new Date(
          `2024-${sch.date.replace(".", "-")} ${sch.time} +8`,
        ).valueOf(),
        location: sch.location,
      }

      return {
        id: generateSessionId(partialSession),
        ...partialSession,
      };
    }),
    duration: parseInt(duration.replace(/[^\d]/, ""), 10),
  };
}

export const films = (
  Object.entries(filmsData) as unknown as [string, RawFilm][]
).map(transformFilm);
export const filmsMap = films.reduce((acc, film) => {
  acc.set(film.id, film);
  return acc;
}, new Map<string, Film>());
