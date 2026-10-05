import type { Metadata } from "next";
import MapaCampoGrande from "@/components/mapa/MapaCampoGrande";

export const metadata: Metadata = {
  title: "Onde Estamos — Campo Grande",
  description: "Mapa 3D com os setores e congregações da IEADMS em Campo Grande/MS. Encontre a igreja mais perto de você.",
};

export default function OndeEstamos() {
  return (
    <main className="fixed inset-0">
      <MapaCampoGrande />
    </main>
  );
}
