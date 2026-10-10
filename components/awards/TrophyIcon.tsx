import Image from "next/image";

export default function TrophyIcon({ className = "h-5 w-5", status = "nominee" }: { className?: string; status?: "winner" | "nominee" }) {
  return <Image src="/awards/tga-trophy.png" width={1442} height={1742} alt="" aria-hidden="true" className={`shrink-0 object-contain ${className}`} style={{ filter: status === "winner" ? "grayscale(1) sepia(1) saturate(2.2) brightness(1.3)" : "grayscale(1) brightness(1.25)" }} />;
}
