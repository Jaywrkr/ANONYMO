import { AGENTES } from "@anonymo/agentes";
import type { Idioma } from "@/lib/idioma";

// schema.org para buscadores (web/18): la agencia, dónde está y qué ofrece.
export function DatosEstructurados({ idioma }: { idioma: Idioma }) {
  const base = (process.env.ANONYMO_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const en = idioma === "en";
  const datos = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Anonymo",
    url: en ? `${base}/en` : base,
    description: en ? "Creative agency in Cuenca, Ecuador: brand, websites, launches and events, with a team of 22 agents." : "Agencia creativa en Cuenca, Ecuador: marca, webs, lanzamientos y eventos, con un equipo de 22 agentes.",
    areaServed: ["EC", "Worldwide"],
    address: { "@type": "PostalAddress", addressLocality: "Cuenca", addressRegion: "Azuay", addressCountry: "EC" },
    founder: [{ "@type": "Person", name: "Jay" }, { "@type": "Person", name: "Luna" }],
    knowsLanguage: ["es", "en"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: en ? "Services" : "Servicios",
      itemListElement: (en ? ["Brand strategy", "Naming", "Visual identity", "Websites and 3D", "Launch content", "Events"] : ["Estrategia de marca", "Naming", "Identidad visual", "Webs y 3D", "Contenido de lanzamiento", "Eventos"]).map((n) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: n } })),
    },
    numberOfEmployees: { "@type": "QuantitativeValue", value: 2 },
    slogan: en ? "We work while you sleep." : "Trabajamos mientras duermes.",
    knowsAbout: AGENTES.map((a) => a.rol),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos) }} />;
}
