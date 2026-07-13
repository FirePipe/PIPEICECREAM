import { GoogleGenAI } from "@google/genai";

// Simple rule-based chatbot for local fallback
export function runRuleBasedFallback(message: string, catalog: any[], config: any): string {
  const msg = message.toLowerCase().trim();
  const shopName = config?.tiendaNombre || "PIPE ICE CREAM";
  
  if (msg.includes("hola") || msg.includes("buenos días") || msg.includes("buenas tardes") || msg.includes("cómo estás") || msg.includes("saludos")) {
    const disponibles = catalog.filter(p => p.stock > 0).map(p => p.nombre).join(", ");
    return `¡Hola! Bienvenido a ${shopName} en Cali. El rincón donde enfriamos tu calor sin que te cueste un ojo de la cara. Ojo: no somos una heladería italiana de autor, somos los reyes del helado de toda la vida, refrescante y al grano. ¿Qué sabor te provoca hoy? Sabores en stock: ${disponibles || "Ninguno... el calor nos dejó sin nada"}.`;
  }
  
  if (msg.includes("precio") || msg.includes("cuánto cuesta") || msg.includes("valor") || msg.includes("costo") || msg.includes("cop")) {
    return `Aquí no nos complicamos con las matemáticas. Todos nuestros helados tienen un precio unificado y democrático de exactamente $2.200 COP c/u. Calidad confiable para el bolsillo del ciudadano promedio.`;
  }

  if (msg.includes("pasarela") || msg.includes("porque no tienes") || msg.includes("por qué no tiene") || msg.includes("tarjeta")) {
    return "Por ahora nuestro presupuesto es tan 'reducido' como el tamaño de una paleta al sol, así que la pasarela de pagos tendrá que esperar a que el banco nos mire con piedad. Pero ojo: el plan maestro a futuro es armar una app web dinámica que automatice todo. Básicamente, estamos a unos cuantos ceros en la cuenta bancaria de convertirnos en el próximo imperio tecnológico de Cali.";
  }

  if (msg.includes("ingrediente") || msg.includes("que tiene") || msg.includes("cómo se hace")) {
    if (msg.includes("fresa")) {
      return "🍓 Fresa: Agua, azúcar y esencia de fresa con un toque frutal. La vieja confiable, bien fría para ganarle al calor de Cali.";
    }
    if (msg.includes("queso") || msg.includes("bocadillo")) {
      return "🧀 Queso Bocadillo: Leche entera pasteurizada, queso campesino rallado y trozos de bocadillo. Tradición industrial en su máximo esplendor.";
    }
    if (msg.includes("coco")) {
      return "🥥 Coco: Base de leche entera, leche condensada y coco rallado para darle textura. Simple, dulce y efectivo.";
    }
    if (msg.includes("salpicon")) {
      return "🍎 Salpicón: Base de agua con sabor a frutas tropicales picadas. Ideal si buscas algo ligero y no lácteo.";
    }
    if (msg.includes("chocovainilla") || msg.includes("vainilla") || msg.includes("chocovailla")) {
      return "🍦 ChocoVainilla: Leche en polvo, galleta de chocolate, cocoa en polvo, sabor artificial a VAINILLA A12 (lo que le da el toque mágico), azúcar refinada y CMC estabilizante. Cero pretensiones, puro sabor.";
    }
    if (msg.includes("ron") || msg.includes("pasas")) {
      return "🍇 Ron & Pasas: Base cremosa de leche con pasas marinadas. Sabor clásico de toda la vida para los de gustos maduros.";
    }
    if (msg.includes("maní") || msg.includes("mani")) {
      return "🥜 Maní: Base de leche combinada con maní tostado crujiente. Si te gustan los frutos secos en su versión masiva, esta es.";
    }
    if (msg.includes("chicle")) {
      return "🎈 Chicle: Esencia industrial de chicle clásico infantil, leche entera y gomitas de colores. Te va a recordar a los cumpleaños de los 90.";
    }
    if (msg.includes("mango") || msg.includes("biche")) {
      return "🥭 Mango Biche: Base de agua con mango verde en julianas, sal y limón. Ácido, refrescante y corta-calor inmediato.";
    }
    if (msg.includes("guanabana") || msg.includes("guanábana")) {
      return "⚪ Guanábana: Base refrescante (agua o leche ligera) con pulpa de guanábana natural y azúcar. Es como un abrazo frío para tu paladar en medio del sofoco de Cali.";
    }
    return "Nuestras paletas comerciales de alta rotación se dividen en base de Agua (Fresa, Salpicón, Mango Biche, Guanábana) y base de Leche (Queso Bocadillo, Coco, ChocoVainilla, Ron con Pasas, Maní, Chicle). ¿De cuál te da curiosidad saber los químicos... digo, ingredientes?";
  }

  if (msg.includes("domicilio") || msg.includes("envio") || msg.includes("envío") || msg.includes("reparto") || msg.includes("entrega")) {
    return "🛵 Envíos y Domicilios: Por el momento NO hacemos domicilios. Nuestro microimperio funciona únicamente de manera local para recogida. Nos encantaría tener una flota de drones repartidores, pero por ahora te toca estirar las piernas y venir por ellos. 😉";
  }

  if (msg.includes("transferencia") || msg.includes("pago") || msg.includes("cuenta") || msg.includes("nequi") || msg.includes("banco")) {
    const num = config?.cuentaNumero || "3184754263";
    const name = config?.cuentaTitular || "Alba Guaca";
    return `🏦 Datos Financieros: Recibimos transferencias al Nequi: ${num} a nombre de ${name}. También aceptamos efectivo (billetes legales, por favor) al recoger tu pedido.`;
  }

  if (msg.includes("agua") || msg.includes("leche") || msg.includes("crema") || msg.includes("lacteo") || msg.includes("lácteo")) {
    return "🥛 Clasificación técnica:\n- Base de Leche (Los cremositos): Queso Bocadillo, Coco, ChocoVainilla, Ron con Pasas, Maní y Chicle.\n- Base de Agua (Los rompe-calor): Fresa, Salpicón, Guanábana y Mango Biche. Todos a $2.200 COP.";
  }
  
  if (msg.includes("disponible") || msg.includes("sabores") || msg.includes("stock") || msg.includes("inventario") || msg.includes("qué hay") || msg.includes("venden") || msg.includes("cuántas unidades") || msg.includes("total")) {
    const disponibles = catalog.filter(p => p.stock > 0);
    const totalStock = catalog.reduce((acc, p) => acc + (p.stock || 0), 0);
    
    if (totalStock === 0) {
      return "Alerta roja: Nos quedamos sin stock temporalmente en Cali. El calor de la ciudad no perdona.";
    }
    
    const listaDisp = catalog
      .map(p => `- ${p.nombre}: ${p.stock > 0 ? `${p.stock} u.` : "AGOTADO"}`)
      .join("\n");
      
    return `Esto es lo que ha sobrevivido al calor de Cali en nuestro inventario:\n\n${listaDisp}\n\n📦 TOTAL UNIDADES: ${totalStock}\n\nTodos nuestros helados tienen un precio unificado de $2.200 COP.`;
  }
  
  // Check if user is asking for a specific product
  for (const prod of catalog) {
    if (msg.includes(prod.nombre.toLowerCase())) {
      if (prod.stock > 0) {
        return `¡Afortunadamente sí! Nos queda el sabor ${prod.nombre} en Cali. Cuesta $2.200 COP y tenemos exactamente ${prod.stock} unidades esperando que las salves de derretirse.`;
      } else {
        return `Malas noticias: El sabor ${prod.nombre} pasó a mejor vida (se agotó). Traeremos más stock pronto antes de que la nevera empiece a llorar.`;
      }
    }
  }

  return "Lo siento, mi base de datos no procesa esa pregunta existencial. Te estoy transfiriendo con nuestro soporte humano.";
}

// Lazy initialize Gemini client safely
let aiClient: GoogleGenAI | null = null;
export function getGeminiClient() {
  if (!aiClient) {
    let apiKey = "";
    if (typeof process !== "undefined" && process.env) {
      apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
    }
    
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      console.warn("GEMINI_API_KEY no definida. Entrando en modo reglas locales.");
      return null;
    }
    try {
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (err) {
      console.error("Error al crear el cliente GoogleGenAI:", err);
      return null;
    }
  }
  return aiClient;
}

export async function handleChatbotRequest(message: string, history: any[], catalog: any[], config: any): Promise<string> {
  const client = getGeminiClient();
  const activeCatalog = catalog || [];
  const activeConfig = config || { tiendaNombre: "PIPE ICE CREAM" };

  if (!client) {
    return runRuleBasedFallback(message, activeCatalog, activeConfig);
  }

  try {
    const catalogString = activeCatalog.length > 0 
      ? activeCatalog.map((p: any) => `- Sabor: ${p.nombre} | Precio: $${Number(p.precio).toLocaleString('es-CO')} COP | Stock: ${p.stock} u. (${p.stock > 0 ? 'Disponible' : 'Agotado'})`).join("\n")
      : "No hay helados registrados en este momento.";

    // SYSTEM INSTRUCTION ACTUALIZADA
    const systemInstruction = `Eres el asistente virtual de PIPE ICE CREAM en Cali, Colombia. Tu personalidad es la de un comerciante serio, honesto, directo y con un humor irónico que acepta con orgullo la humilde pero visionaria realidad del negocio.

REALIDAD DEL NEGOCIO Y PERSONALIDAD:
- Sede única: Cali, CO. (No operamos en otras ciudades).
- NO somos artesanales ni gourmet. Somos distribuidores de helados comerciales, ricos, ultra refrescantes y baratos. Nuestro lema: EL SABOR QUE REFRESCA TU DÍA.
- Responde siempre de forma directa, seria, pero con toques cómicos y sinceros. Máximo 2 o 3 oraciones por respuesta.

NORMAS DE COMPORTAMIENTO Y HABILIDADES:
1. CHARLA Y PREGUNTAS GENERALES: Si te preguntan "¿quién eres?", "¿qué haces?", "¿cómo estás?" o te sacan conversación, responde con tu personalidad de vendedor de helados ocupado de Cali. Ej: "Aquí, batallando contra el calor de Cali y cuidando que las paletas no se vuelvan jugo. ¿Y tú qué cuentas o qué helado vas a comprar?".
2. MATEMÁTICAS Y LÓGICA: Si te piden hacer sumas, multiplicaciones o cuentas, ¡hazlas! Pero añade tu toque cómico (ej: "2 + 2 es 4. Menos mal mis matemáticas para cobrar los helados de $2.200 son mejores que las tuyas").
3. OPINIONES Y FEEDBACK: Si te dejan una opinión o sugerencia, agradécela con tu estilo irónico y guárdala "en tu libreta mental" (ej: "Anotado en nuestro sistema de alta tecnología... o sea, en un papelito que no se va a perder").
4. FILTRO DE RESPETO Y SEGURIDAD: 
   - Ignora, desvía con elegancia o responde con ironía seria a insultos, comentarios groseros o contenido ofensivo. Mantén la compostura y pon límites con humor serio: "En Pipe Ice Cream congelamos el calor, no la educación. Bajemos el tono o me va a tocar cobrarte doble."
   - No generes contenido peligroso, ilegal o dañino.
5. FALLBACK RESTRINGIDO: Solo si te piden cosas técnicas complejas que no puedas hacer (como escribir código de programación o cosas muy fuera de lugar), di que no puedes y transfiérelos al soporte humano.

Catálogo disponible en tiempo real:
${catalogString}

Nombre de la tienda: ${activeConfig.tiendaNombre}.

Reglas de Negocio Estrictas:
1. Precio único: Todos los helados cuestan exactamente $2.200 COP de forma unificada. No pidas de más, no te daremos de menos.
2. Si preguntan stock o sabores, lista ÚNICAMENTE los que tienen stock > 0.
3. INGREDIENTES SIN PRETENSIONES (10 SABORES):
   - Fresa: Fresas naturales picadas, agua y azúcar (Base agua).
   - Queso Bocadillo: Queso campesino, bocadillo veleño y leche entera (Base leche).
   - Coco: Coco natural rallado, leche condensada y leche entera (Base leche).
   - Salpicón: Piña, sandía, mango en jugo natural y agua (Base agua).
   - ChocoVainilla (o Chocovailla): Leche en polvo, galleta chocolate, cocoa en polvo, sabor artificial a VAINILLA A12 (el secreto industrial), azúcar refinada, cmc estabilizante (Base leche).
   - Ron & Pasas: Pasas marinadas, leche condensada y leche (Base leche).
   - Maní: Maní tostado crujiente, mantequilla de maní y leche (Base leche).
   - Chicle: Esencia de chicle clásica, gomitas y leche entera (Base leche).
   - Paletas Mango Biche: Mango verde en julianas, sal, limón y agua (Base agua).
   - Guanábana: Pulpa de guanábana natural, azúcar y base refrescante (Base agua/leche).
4. PASARELA DE PAGO: Si preguntan por tarjetas o por qué no hay pasarela de pago, responde textualmente: "Por ahora somos un microemprendimiento con un presupuesto muy 'artesanal', así que la pasarela de pagos tendrá que esperar a que el capital esté de acuerdo. Pero ojo, que esto es solo el inicio. El plan maestro a futuro, cuando el flujo de caja lo permita, es transformar esto en una app web dinámica que automatice las órdenes con su pasarela nativa. Básicamente, estamos a unos cuantos ceros en la cuenta bancaria de convertirnos en el próximo imperio tecnológico."
5. STOCK Y CONSULTAS: Si preguntan por el stock, inventario o cuántos helados quedan, responde listando todos los sabores del catálogo indicando cuántas unidades hay de cada uno (incluso si hay 0 o está AGOTADO) y calcula el TOTAL de unidades en la nevera. Sé preciso con los números que te doy en el catálogo.
6. DOMICILIOS: No hacemos domicilios por ahora. Es recogida local. (Mete un chiste serio de que no nos alcanza para la gasolina o los drones para sortear el tráfico de Cali).
7. MEDIOS DE PAGO: Nequi 3184754263 a nombre de Alba Guaca. O efectivo al recoger.
8. Si te saludan, saluda mencionando a PIPE ICE CREAM y pregunta qué sabor de paleta comercial y refrescante buscan hoy para sobrevivir al calor de Cali."`;

    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((turn: any) => {
        contents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.text }]
        });
      });
    }
    
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    // Highly resilient retry and model fallback strategy (gemini-3.5-flash -> gemini-3.1-flash-lite)
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
    let lastError: any = null;
    let responseText = "";

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[Chatbot] Trying ${model} (Attempt ${attempt}/2)...`);
          const response = await client.models.generateContent({
            model: model,
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.7,
            },
          });
          if (response && response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.log(`[Chatbot] Attempt ${attempt} with ${model} did not complete successfully. Retrying next step...`);
          // Wait briefly (500ms) before retrying
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      if (responseText) break;
    }

    if (!responseText) {
      throw lastError || new Error("Failed to generate response after trying multiple models.");
    }

    return responseText;
  } catch (err: any) {
    const isRateLimit = err?.message?.toLowerCase().includes("rate") || 
                       err?.message?.includes("429") ||
                       err?.status === 429;
                       
    if (isRateLimit) {
      console.log("Notice: Gemini API rate limit reached. Falling back to rule-based logic.");
    } else {
      console.log("Notice: Gemini API not responding in backend core, using rule-based logic.");
    }
    
    return runRuleBasedFallback(message, activeCatalog, activeConfig);
  }
}