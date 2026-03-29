// Place this file in your project at:
// app/palette/page.tsx
// Then open http://localhost:3000/palette

export default function PalettePage() {
  const palettes = [
    {
      id: 1,
      name: "Pastel Sky",
      mood: "airy blue calm",
      colors: ["#EDF5FF","#DCEBFF","#CFE3FF","#FFF6CC","#E9E0F7"],
    },
    {
      id: 2,
      name: "Mint Breeze",
      mood: "fresh green calm",
      colors: ["#EAF7F3","#D7F0E6","#C4E8DB","#FFF5C9","#E8DFF5"],
    },
    {
      id: 3,
      name: "Lavender Field",
      mood: "soft purple soothing",
      colors: ["#F2EEFF","#E5DEFF","#D8CCFF","#E8F5E9","#FFF5CC"],
    },
    {
      id: 4,
      name: "Spring Garden",
      mood: "balanced pastel mix",
      colors: ["#E8F4FF","#DFF4E8","#FFF6D6","#E9E0F7","#DCEBFF"],
    },
    {
      id: 5,
      name: "Soft Lagoon",
      mood: "aqua modern",
      colors: ["#E6F7FF","#CFF1F7","#D7F2E3","#FFF4C6","#E3D8F6"],
    },
    {
      id: 6,
      name: "Calm Horizon",
      mood: "trustworthy pastel mix",
      colors: ["#EDF5FF","#DFF4E8","#FFF6D6","#E9E0F7","#DCEBFF"],
    },
    {
      id: 7,
      name: "Morning Light",
      mood: "bright optimistic",
      colors: ["#F0F7FF","#E0F2FF","#DFF5EA","#FFF8D9","#EFE6FF"],
    },
    {
      id: 8,
      name: "Ocean Pastel",
      mood: "blue‑green clarity",
      colors: ["#EAF6FF","#D4EEFF","#C7F0E8","#FFF6D6","#E7E1FF"],
    },
    {
      id: 9,
      name: "Meadow Light",
      mood: "green gentle",
      colors: ["#F0FBF6","#DBF4E7","#C8ECD9","#FFF6CC","#E9E1F7"],
    },
    {
      id: 10,
      name: "Soft Sunrise",
      mood: "warm pastel optimism",
      colors: ["#FFF4F2","#FFE4F0","#E8F0FF","#E4F6E9","#FFF6CC"],
    },
    {
      id: 11,
      name: "Cloud Garden",
      mood: "very calm background palette",
      colors: ["#F7FAFF","#EEF6FF","#E9F7F0","#FFF9E6","#F1ECFF"],
    },
    {
      id: 12,
      name: "Nordic Pastel",
      mood: "clean modern SaaS",
      colors: ["#F1F6FF","#E3EEFF","#E4F5ED","#FFF7D9","#ECE4FF"],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FCF8F3] p-10 text-slate-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-semibold mb-6">Product Color Palette Board</h1>
        <p className="text-slate-600 mb-10">
          Choose the palette that best fits the calm, warm feeling we want for the
          product. Reply with the palette number.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {palettes.map((palette) => (
            <div
              key={palette.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="p-5">
                <div className="text-sm text-slate-500">Palette {palette.id}</div>
                <h2 className="text-xl font-semibold">{palette.name}</h2>
                <p className="text-sm text-slate-600">{palette.mood}</p>
              </div>

              <div className="flex h-24">
                {palette.colors.map((c) => (
                  <div key={c} className="flex-1" style={{ background: c }} />
                ))}
              </div>

              <div className="p-4 text-sm space-y-1">
                {palette.colors.map((c) => (
                  <div key={c} className="flex justify-between">
                    <span>Color</span>
                    <code className="text-slate-500">{c}</code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
