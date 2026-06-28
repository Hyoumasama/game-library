export function getIcon(value?: string) {
  const text = value?.trim().toLowerCase();

  const icons: Record<string, string> = {
    psn: "/platforms/psn.png",
    steam: "/platforms/steam.png",
    epic: "/platforms/epicgames.png",
    "ubisoft connect": "/platforms/ubisoftconnect.jpeg",
    piracy: "/platforms/piracy.png",
    xbox: "/platforms/xbox.png",
    "ea desktop": "/platforms/eadesktop.ico",
    gog: "/platforms/gog.jpeg",
    nintendo: "/platforms/nintendo.png",
    switch: "/platforms/switch.png",
    legacy: "/platforms/legacy.png",
    "humble bundle": "/platforms/humble.png",

    yuzu: "/platforms/yuzu.png",
    citra: "/platforms/citra.png",
    cemu: "/platforms/cemu.png",
    dolphin: "/platforms/dolphin.png",
    retroarch: "/platforms/retroarch2.png",
    ryujinx: "/platforms/ryujinx.png",
    rpcs3: "/platforms/rpcs3.png",
    duckstation: "/platforms/duckstation.png",
    pcsx2: "/platforms/pcsx2.png",
    melonds: "/platforms/melonDS.png",
    xemu: "/platforms/xenia.png",
    primehack: "/platforms/primehack.png",
    vita3k: "/platforms/vita3k.png",
    ppsspp: "/platforms/ppsspp.png",

    pc: "/hardware/pc.png",
    steamdeck: "/hardware/steamdeck2.png",
    ps3: "/hardware/playstation3.png",
    ps4: "/hardware/playstation4.png",
    ps5: "/hardware/playstation5.png",
  };

  if (!text) return null;

  return icons[text] || null;
}