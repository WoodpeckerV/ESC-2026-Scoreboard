import flagDenmark from "../../to_use/flags/01_denmark.png";
import flagGermany from "../../to_use/flags/02_germany.png";
import flagIsrael from "../../to_use/flags/03_israel.png";
import flagBelgium from "../../to_use/flags/04_belgium.png";
import flagAlbania from "../../to_use/flags/05_albania.png";
import flagGreece from "../../to_use/flags/06_greece.png";
import flagUkraine from "../../to_use/flags/07_ukraine.png";
import flagAustralia from "../../to_use/flags/08_australia.png";
import flagSerbia from "../../to_use/flags/09_serbia.png";
import flagMalta from "../../to_use/flags/10_malta.png";
import flagCzechia from "../../to_use/flags/11_czechia.png";
import flagBulgaria from "../../to_use/flags/12_bulgaria.png";
import flagCroatia from "../../to_use/flags/13_croatia.png";
import flagUnitedKingdom from "../../to_use/flags/14_united_kingdom.png";
import flagFrance from "../../to_use/flags/15_france.png";
import flagMoldova from "../../to_use/flags/16_moldova.png";
import flagFinland from "../../to_use/flags/17_finland.png";
import flagPoland from "../../to_use/flags/18_poland.png";
import flagLithuania from "../../to_use/flags/19_lithuania.png";
import flagSweden from "../../to_use/flags/20_sweden.png";
import flagCyprus from "../../to_use/flags/21_cyprus.png";
import flagItaly from "../../to_use/flags/22_italy.png";
import flagNorway from "../../to_use/flags/23_norway.png";
import flagRomania from "../../to_use/flags/24_romania.png";
import flagAustria from "../../to_use/flags/25_austria.png";

export interface Country {
  id: string;
  order: number;
  name: string;
  flag: string;
}

export const countries: Country[] = [
  { id: "denmark", order: 1, name: "Denmark", flag: flagDenmark },
  { id: "germany", order: 2, name: "Germany", flag: flagGermany },
  { id: "israel", order: 3, name: "Israel", flag: flagIsrael },
  { id: "belgium", order: 4, name: "Belgium", flag: flagBelgium },
  { id: "albania", order: 5, name: "Albania", flag: flagAlbania },
  { id: "greece", order: 6, name: "Greece", flag: flagGreece },
  { id: "ukraine", order: 7, name: "Ukraine", flag: flagUkraine },
  { id: "australia", order: 8, name: "Australia", flag: flagAustralia },
  { id: "serbia", order: 9, name: "Serbia", flag: flagSerbia },
  { id: "malta", order: 10, name: "Malta", flag: flagMalta },
  { id: "czechia", order: 11, name: "Czechia", flag: flagCzechia },
  { id: "bulgaria", order: 12, name: "Bulgaria", flag: flagBulgaria },
  { id: "croatia", order: 13, name: "Croatia", flag: flagCroatia },
  { id: "united-kingdom", order: 14, name: "United Kingdom", flag: flagUnitedKingdom },
  { id: "france", order: 15, name: "France", flag: flagFrance },
  { id: "moldova", order: 16, name: "Moldova", flag: flagMoldova },
  { id: "finland", order: 17, name: "Finland", flag: flagFinland },
  { id: "poland", order: 18, name: "Poland", flag: flagPoland },
  { id: "lithuania", order: 19, name: "Lithuania", flag: flagLithuania },
  { id: "sweden", order: 20, name: "Sweden", flag: flagSweden },
  { id: "cyprus", order: 21, name: "Cyprus", flag: flagCyprus },
  { id: "italy", order: 22, name: "Italy", flag: flagItaly },
  { id: "norway", order: 23, name: "Norway", flag: flagNorway },
  { id: "romania", order: 24, name: "Romania", flag: flagRomania },
  { id: "austria", order: 25, name: "Austria", flag: flagAustria },
];

export const countryById = new Map(countries.map((country) => [country.id, country]));

export type CountryId = Country["id"];
