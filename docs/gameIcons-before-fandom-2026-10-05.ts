export function getIcon(value?: string | null) {
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
    azahar: "/platforms/azahar.svg",
    cemu: "/platforms/cemu.png",
    dolphin: "/platforms/dolphin.png",
    retroarch: "/platforms/retroarch2.png",
    ryujinx: "/platforms/ryujinx.png",
    rpcs3: "/platforms/rpcs3.png",
    duckstation: "/platforms/duckstation.png",
    pcsx2: "/platforms/pcsx2.png",
    melonds: "/platforms/melonDS.png",
    xemu: "/platforms/xemu.svg",
    xenia: "/platforms/xenia.png",
    primehack: "/platforms/primehack.png",
    vita3k: "/platforms/vita3k.svg",
    ppsspp: "/platforms/ppsspp.png",

    pc: "/hardware/pc.png",
    steamdeck: "/hardware/steamdeck2.png",
    "steam deck": "/hardware/steamdeck2.png",
    ps1: "/hardware/playstation.png",
    psx: "/hardware/playstation.png",
    playstation: "/hardware/playstation.png",
    "playstation 1": "/hardware/playstation.png",
    ps2: "/hardware/ps2-compact.svg",
    "playstation 2": "/hardware/ps2-compact.svg",
    ps3: "/hardware/playstation3.png",
    "playstation 3": "/hardware/playstation3.png",
    ps4: "/hardware/playstation4.png",
    ps5: "/hardware/playstation5.png",
    "nintendo switch": "/platforms/switch.png",
    wii: "/hardware/wii-badge.svg",
    "nintendo wii": "/hardware/wii-badge.svg",
    wiiu: "/hardware/wiiu-badge.svg",
    "wii u": "/hardware/wiiu-badge.svg",
    "nintendo wii u": "/hardware/wiiu-badge.svg",
    gamecube: "/hardware/gamecube.svg",
    "nintendo gamecube": "/hardware/gamecube.svg",
    "3ds": "/hardware/3ds-badge.svg",
    "nintendo 3ds": "/hardware/3ds-badge.svg",
    ds: "/hardware/ds-badge.svg",
    "nintendo ds": "/hardware/ds-badge.svg",
    n64: "/hardware/n64-logo.svg",
    "nintendo 64": "/hardware/n64-logo.svg",
    gba: "/hardware/gba-badge.svg",
    "game boy advance": "/hardware/gba-badge.svg",
    gbc: "/hardware/gbc-badge.svg",
    "game boy color": "/hardware/gbc-badge.svg",
    gb: "/hardware/gameboy.svg",
    "game boy": "/hardware/gameboy.svg",
    nes: "/hardware/nes.svg",
    "nintendo entertainment system": "/hardware/nes.svg",
    famicom: "/hardware/famicom.svg",
    "famicom disk system": "/hardware/famicom.svg",
    snes: "/hardware/snes-emblem.svg",
    "super nintendo": "/hardware/snes-emblem.svg",
    "super nintendo entertainment system": "/hardware/snes-emblem.svg",
    "super famicom": "/hardware/snes-emblem.svg",
    psp: "/hardware/psp.svg",
    "playstation portable": "/hardware/psp.svg",
    "ps vita": "/hardware/psvita.svg",
    psvita: "/hardware/psvita.svg",
    "playstation vita": "/hardware/psvita.svg",
    "xbox 360": "/hardware/xbox360.svg",
    xbox360: "/hardware/xbox360.svg",
    "original xbox": "/hardware/xbox-original.svg",
    "xbox original": "/hardware/xbox-original.svg",
    msx2: "/hardware/msx2.svg",
    "msx 2": "/hardware/msx2.svg",
  };

  if (!text) return null;

  return icons[text] || null;
}

// Wide wordmarks need a wider slot; squeezing them into 16px makes them illegible.
export function getIconBadgeWidth(icon: string) {
  if (["/hardware/gamecube.svg", "/hardware/n64-logo.svg", "/hardware/snes-emblem.svg"].includes(icon)) return 18;
  if (icon === "/hardware/ps2-compact.svg") return 42;
  if (icon.startsWith("/hardware/") && icon.endsWith(".svg") && !icon.endsWith("/gamecube.svg")) return 40;
  if (icon === "/platforms/xemu.svg") return 40;
  return 16;
}
