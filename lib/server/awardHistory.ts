import "server-only";
import { createHash } from "node:crypto";
import y2014 from "@/data/awards/tga-2014.json";
import y2015 from "@/data/awards/tga-2015.json";
import y2016 from "@/data/awards/tga-2016.json";
import y2017 from "@/data/awards/tga-2017.json";
import y2018 from "@/data/awards/tga-2018.json";
import y2019 from "@/data/awards/tga-2019.json";
import y2020 from "@/data/awards/tga-2020.json";
import y2021 from "@/data/awards/tga-2021.json";
import y2022 from "@/data/awards/tga-2022.json";
import y2023 from "@/data/awards/tga-2023.json";
import y2024 from "@/data/awards/tga-2024.json";
import y2025 from "@/data/awards/tga-2025.json";
import publication from "@/data/awards/verification/publication.json";
const history=[y2014,y2015,y2016,y2017,y2018,y2019,y2020,y2021,y2022,y2023,y2024,y2025];
export function verifiedAwardHistory(year: number) {
  const event=history.find(e=>e.year===year), proof=publication.find(e=>e.year===year);
  if (!event || !proof?.verified || proof.status!=="published" || !event.verified || event.status!=="published") return null;
  if (createHash("sha256").update(JSON.stringify(event)).digest("hex")!==proof.sha256) return null;
  return event;
}
