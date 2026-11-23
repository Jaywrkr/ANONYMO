import type { Idioma } from "@/lib/idioma";

// schema.org para buscadores (web/18): la agencia y qué ofrece.
export function DatosEstructurados({ idioma }: { idioma: Idioma }) {
  const base = (process.env.ANONYMO_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const en = idioma === "en";
  const datos = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Unmake",
    url: en ? `${base}/en` : base,
    description: en ? "Creative agency of two people: design, technology and communication. Websites, brand, apps, content and events." : "Agencia creativa de dos personas: diseño, tecnología y comunicación. Webs, marca, apps, contenido y eventos.",
    areaServed: "Worldwide",
    founder: [{ "@type": "Person", name: "Jay" }, { "@type": "Person", name: "Luna" }],
    knowsLanguage: ["es", "en"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: en ? "Services" : "Servicios",
      itemListElement: (en ? ["Websites", "Brand identity", "Apps and business systems", "Games and interactive experiences", "Social media and content", "Video and photography", "Events"] : ["Webs", "Identidad de marca", "Apps y sistemas para empresas", "Juegos y experiencias interactivas", "Redes sociales y contenido", "Video y fotografía", "Eventos"]).map((n) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: n } })),
    },
    numberOfEmployees: { "@type": "QuantitativeValue", value: 2 },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos) }} />;
}
