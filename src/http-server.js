import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

import { productos } from "./data/productos.js";
import { clientes } from "./data/clientes.js";
import { sucursales } from "./data/sucursales.js";
import { ordenes } from "./data/ordenes.js";
import { categorias } from "./data/categorias.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public"), { etag: false, lastModified: false }));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// ─── AUTH: stores y utilidades ───────────────────────────────────────────────

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(":");
    const hashBuf   = scryptSync(password, salt, 64);
    const storedBuf = Buffer.from(hash, "hex");
    return timingSafeEqual(hashBuf, storedBuf);
  } catch { return false; }
}

function parseCookies(req) {
  const map = {};
  (req.headers.cookie || "").split(";").forEach(pair => {
    const [k, ...v] = pair.trim().split("=");
    if (k) map[k.trim()] = decodeURIComponent(v.join("="));
  });
  return map;
}

// Almacenes en memoria (se reinician con el servidor)
const sessions     = {};          // token → userId
const carritos     = {};          // userId → [{ productoId, cantidad }]
const ordenesStore = [];          // órdenes generadas en el carrito
let   nextUId      = 200;

// Usuarios demo (contraseña: Demo1234)
const usuariosStore = [
  { id: "U001", nombre: "Carlos Pérez",  email: "carlos@demo.com", passwordHash: hashPassword("Demo1234"), tarjetaFidelidad: "GOLD",   puntos: 1500 },
  { id: "U002", nombre: "María López",   email: "maria@demo.com",  passwordHash: hashPassword("Demo1234"), tarjetaFidelidad: "SILVER",  puntos: 800  },
];

function getSession(req) {
  const token  = parseCookies(req)["mgc_session"];
  if (!token) return null;
  const userId = sessions[token];
  if (!userId) return null;
  return { token, user: usuariosStore.find(u => u.id === userId) };
}

// ─── AUTH: endpoints ──────────────────────────────────────────────────────────

app.post("/api/auth/registro", (req, res) => {
  const { nombre, email, password } = req.body || {};
  if (!nombre?.trim() || !email?.trim() || !password)
    return res.status(400).json({ error: "nombre, email y password son requeridos" });

  const emailLower = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower))
    return res.status(400).json({ error: "Email inválido" });
  if (password.length < 6)
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  if (usuariosStore.find(u => u.email === emailLower))
    return res.status(409).json({ error: "Ya existe una cuenta con ese correo" });

  nextUId++;
  const user = {
    id: `U${nextUId}`,
    nombre: nombre.trim(),
    email: emailLower,
    passwordHash: hashPassword(password),
    tarjetaFidelidad: "BRONZE",
    puntos: 0,
  };
  usuariosStore.push(user);

  const token = randomBytes(32).toString("hex");
  sessions[token] = user.id;
  res.cookie("mgc_session", token, { httpOnly: true, sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000 });
  const { passwordHash: _, ...pub } = user;
  res.status(201).json({ usuario: pub });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email y password son requeridos" });

  const user = usuariosStore.find(u => u.email === email.toLowerCase().trim());
  if (!user || !verifyPassword(password, user.passwordHash))
    return res.status(401).json({ error: "Credenciales incorrectas" });

  const token = randomBytes(32).toString("hex");
  sessions[token] = user.id;
  res.cookie("mgc_session", token, { httpOnly: true, sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000 });
  const { passwordHash: _, ...pub } = user;
  res.json({ usuario: pub });
});

app.post("/api/auth/logout", (req, res) => {
  const token = parseCookies(req)["mgc_session"];
  if (token) delete sessions[token];
  res.clearCookie("mgc_session");
  res.json({ ok: true });
});

app.get("/api/auth/perfil", (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "No autenticado" });
  const { passwordHash: _, ...pub } = session.user;
  res.json(pub);
});

// ─── CARRITO: endpoints ───────────────────────────────────────────────────────

app.get("/api/carrito", (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "No autenticado" });

  const items = (carritos[session.user.id] || []).map(item => {
    const p = productos.find(x => x.id === item.productoId);
    if (!p) return null;
    const cat = categorias.find(c => c.id === p.categoriaId);
    return { ...item, nombre: p.nombre, precio: p.precio, unidad: p.unidad,
             stock: p.stock, categoria: cat?.nombre ?? p.categoriaId };
  }).filter(Boolean);

  const total      = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const totalItems = items.reduce((s, i) => s + i.cantidad, 0);
  res.json({ items, total, totalItems });
});

app.post("/api/carrito/agregar", (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "No autenticado" });

  const { productoId, cantidad = 1 } = req.body || {};
  if (!productoId) return res.status(400).json({ error: "productoId requerido" });

  const producto = productos.find(p => p.id === productoId.toUpperCase());
  if (!producto) return res.status(404).json({ error: "Producto no encontrado" });

  const qty  = Math.max(1, parseInt(cantidad) || 1);
  const cart = carritos[session.user.id] ?? (carritos[session.user.id] = []);
  const item = cart.find(i => i.productoId === productoId.toUpperCase());

  if (item) {
    item.cantidad = Math.min(item.cantidad + qty, producto.stock);
  } else {
    cart.push({ productoId: productoId.toUpperCase(), cantidad: qty });
  }

  res.json({ ok: true, totalItems: cart.reduce((s, i) => s + i.cantidad, 0) });
});

app.put("/api/carrito/item/:productoId", (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "No autenticado" });

  const pid  = req.params.productoId.toUpperCase();
  const cart = carritos[session.user.id] || [];
  const qty  = parseInt(req.body?.cantidad);

  if (!qty || qty < 1) {
    carritos[session.user.id] = cart.filter(i => i.productoId !== pid);
  } else {
    const item = cart.find(i => i.productoId === pid);
    if (!item) return res.status(404).json({ error: "Item no encontrado" });
    item.cantidad = qty;
  }
  res.json({ ok: true });
});

app.delete("/api/carrito/item/:productoId", (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "No autenticado" });

  const pid = req.params.productoId.toUpperCase();
  carritos[session.user.id] = (carritos[session.user.id] || []).filter(i => i.productoId !== pid);
  res.json({ ok: true });
});

app.delete("/api/carrito", (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "No autenticado" });
  carritos[session.user.id] = [];
  res.json({ ok: true });
});

app.post("/api/carrito/checkout", (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "No autenticado" });

  const { direccion, metodoPago = "tarjeta" } = req.body || {};
  if (!direccion?.trim()) return res.status(400).json({ error: "Dirección de entrega requerida" });

  const cart = carritos[session.user.id] || [];
  if (!cart.length) return res.status(400).json({ error: "El carrito está vacío" });

  const items = cart.map(item => {
    const p = productos.find(x => x.id === item.productoId);
    if (!p) return null;
    return { productoId: item.productoId, nombre: p.nombre,
             cantidad: item.cantidad, precioUnit: p.precio, subtotal: p.precio * item.cantidad };
  }).filter(Boolean);

  const total = items.reduce((s, i) => s + i.subtotal, 0);
  const orden = {
    id:             `ORD-${Date.now()}`,
    clienteId:      session.user.id,
    clienteNombre:  session.user.nombre,
    items,
    total,
    direccion:      direccion.trim(),
    metodoPago,
    estado:         "pendiente",
    fecha:          new Date().toISOString(),
  };

  ordenesStore.push(orden);
  carritos[session.user.id] = [];

  const puntosGanados = Math.floor(total / 1000);
  session.user.puntos += puntosGanados;

  res.status(201).json({ orden, puntosGanados, totalPuntos: session.user.puntos });
});

// ─── IMAGEN ESPECÍFICA POR PRODUCTO ──────────────────────────────────────────

const productKeywords = {
  // GRANOS Y CEREALES
  "P001":  "rice,white,grain",           "P013":  "sugar,white,sweet",
  "GC001": "lentils,green,legume",       "GC002": "kidney,beans,red",
  "GC003": "oats,oatmeal,breakfast",     "GC004": "quinoa,grain,bowl",
  "GC005": "popcorn,corn,kernels",       "GC006": "brown,rice,grain",
  "GC007": "chickpeas,legume,bowl",      "GC008": "barley,grain,seeds",
  "GC009": "wheat,grain,field",          "GC010": "semolina,flour,pasta",
  // ACEITES
  "P002":  "cooking,oil,bottle",         "AC001": "olive,oil,bottle",
  "AC002": "sunflower,oil,bottle",       "AC003": "coconut,oil,jar",
  "AC004": "corn,oil,bottle",            "AC005": "avocado,oil,bottle",
  "AC006": "canola,oil,bottle",          "AC007": "vegetable,oil,bottle",
  "AC008": "sesame,oil,asian",           "AC009": "palm,oil,bottle",
  "AC010": "cooking,spray,can",
  // LÁCTEOS
  "P003":  "milk,carton,white",          "P012":  "butter,dairy,yellow",
  "LA001": "yogurt,jar,dairy",           "LA002": "mozzarella,cheese,ball",
  "LA003": "cream,dairy,liquid",         "LA004": "fresh,cheese,white",
  "LA005": "skim,milk,bottle",           "LA006": "caramel,dulce,leche,jar",
  "LA007": "powdered,milk,tin",          "LA008": "kefir,yogurt,drink",
  "LA009": "cream,cheese,spread",        "LA010": "condensed,milk,can",
  // PANADERÍA
  "P004":  "sliced,bread,loaf",          "PA001": "croissant,pastry,butter",
  "PA002": "bread,roll,wheat",           "PA003": "whole,wheat,bread,loaf",
  "PA004": "cookies,biscuit,tea",        "PA005": "toast,crisp,bread",
  "PA006": "sponge,cake,vanilla",        "PA007": "cheese,ball,fried,bread",
  "PA008": "oat,cookies,chocolate",      "PA009": "pita,bread,flat",
  "PA010": "brownie,chocolate,square",
  // CARNES
  "P005":  "whole,chicken,fresh",        "CA001": "chicken,breast,raw",
  "CA002": "ground,beef,raw",            "CA003": "pork,chop,raw",
  "CA004": "bologna,sausage,sliced",     "CA005": "tilapia,fish,fillet",
  "CA006": "hot,dog,frankfurter",        "CA007": "beef,tenderloin,steak",
  "CA008": "pork,ribs,smoked",           "CA009": "shrimp,prawn,seafood",
  "CA010": "mortadella,deli,meat",
  // BEBIDAS
  "P006":  "coca,cola,bottle,soda",      "P010":  "coffee,bag,roasted",
  "BE001": "water,bottle,clear",         "BE002": "mango,juice,carton",
  "BE003": "apple,soda,bottle",          "BE004": "energy,drink,can",
  "BE005": "green,tea,bottle,drink",     "BE006": "beer,bottle,cold",
  "BE007": "hot,chocolate,powder,mug",   "BE008": "orange,juice,fresh",
  "BE009": "sparkling,water,glass",      "BE010": "sports,drink,bottle",
  // ASEO DEL HOGAR
  "P007":  "laundry,detergent,box",      "AH001": "floor,cleaner,mop",
  "AH002": "bleach,bottle,white",        "AH003": "fabric,softener,blue",
  "AH004": "bar,soap,cleaning",          "AH005": "paper,towel,kitchen,roll",
  "AH006": "trash,bag,garbage",          "AH007": "dish,soap,sponge",
  "AH008": "air,freshener,spray",        "AH009": "toilet,paper,roll,white",
  "AH010": "sponge,scrub,kitchen",
  // HIGIENE PERSONAL
  "P008":  "soap,bar,white,bath",        "P014":  "shampoo,bottle,hair",
  "HP001": "toothpaste,tube,mint",       "HP002": "deodorant,spray,underarm",
  "HP003": "toothbrush,dental,brush",    "HP004": "body,lotion,moisturizer",
  "HP005": "sunscreen,spf,beach",        "HP006": "wet,wipes,pack",
  "HP007": "razor,blade,shaving",        "HP008": "conditioner,hair,bottle",
  "HP009": "talcum,powder,container",    "HP010": "dental,floss,box",
  // SNACKS
  "P009":  "potato,chips,crispy,bag",    "SN001": "cheese,puffs,orange,bag",
  "SN002": "peanuts,roasted,bowl",       "SN003": "oreo,cookies,chocolate",
  "SN004": "popcorn,bag,microwave",      "SN005": "granola,honey,bowl",
  "SN006": "gummy,bears,colorful",       "SN007": "cereal,granola,bar",
  "SN008": "nachos,tortilla,chips",      "SN009": "almonds,nuts,bowl",
  "SN010": "chocolate,candy,mixed",
  // ENLATADOS
  "P011":  "tuna,can,fish,tin",          "EN001": "sardines,can,fish",
  "EN002": "sweet,corn,can",             "EN003": "black,beans,can",
  "EN004": "peeled,tomato,can",          "EN005": "peas,green,can",
  "EN006": "mushrooms,can,food",         "EN007": "palm,heart,vegetable",
  "EN008": "peach,syrup,can,fruit",      "EN009": "chicken,can,meat",
  "EN010": "ketchup,tomato,sauce",
  // BEBÉ
  "P015":  "diapers,baby,pack",          "BB001": "baby,formula,milk,can",
  "BB002": "baby,food,puree,jar",        "BB003": "baby,wipes,pack",
  "BB004": "diapers,baby,disposable",    "BB005": "baby,shampoo,bottle",
  "BB006": "diaper,rash,cream,tube",     "BB007": "baby,cereal,porridge",
  "BB008": "baby,bottle,feeding",        "BB009": "soy,formula,baby,powder",
  "BB010": "pacifier,baby,soother",
  // TECNOLOGÍA - COMPUTADORES
  "T001":  "lenovo,laptop,computer",     "TC001": "hp,laptop,notebook",
  "TC002": "macbook,apple,silver",       "TC003": "desktop,computer,tower",
  "TC004": "monitor,screen,led",         "TC005": "asus,laptop,vivobook",
  "TC006": "mechanical,keyboard,rgb",    "TC007": "wireless,mouse,computer",
  "TC008": "external,hard,drive",        "TC009": "ram,memory,module",
  "TC010": "thinkpad,business,laptop",
  // TECNOLOGÍA - CELULARES
  "T002":  "samsung,galaxy,android",     "TF001": "iphone,apple,white",
  "TF002": "xiaomi,redmi,phone",         "TF003": "samsung,galaxy,s23",
  "TF004": "motorola,smartphone",        "TF005": "phone,case,silicone",
  "TF006": "usb,charger,cable,fast",     "TF007": "realme,smartphone",
  "TF008": "powerbank,battery,portable", "TF009": "screen,protector,glass",
  "TF010": "huawei,smartphone,android",
  // TECNOLOGÍA - TELEVISORES
  "T003":  "lg,tv,4k,living,room",       "TV001": "samsung,qled,television",
  "TV002": "sony,oled,tv,cinema",        "TV003": "smart,tv,32,inch",
  "TV004": "tcl,tv,large,screen",        "TV005": "lg,nanocell,4k,tv",
  "TV006": "panasonic,tv,led",           "TV007": "tv,wall,mount,bracket",
  "TV008": "xiaomi,smart,tv",            "TV009": "remote,control,television",
  "TV010": "samsung,8k,tv,ultra",
  // TECNOLOGÍA - AUDIO
  "T004":  "sony,headphones,wireless",   "TA001": "airpods,pro,white,case",
  "TA002": "jbl,flip,speaker,portable",  "TA003": "soundbar,samsung,speaker",
  "TA004": "sony,earbuds,true,wireless", "TA005": "bluetooth,speaker,compact",
  "TA006": "gaming,headset,headphones",  "TA007": "microphone,usb,studio",
  "TA008": "beats,headphones,black",     "TA009": "amazon,echo,dot,smart",
  "TA010": "sony,headphones,wired",
  // TECNOLOGÍA - TABLETS
  "T005":  "ipad,apple,tablet,white",    "TT001": "samsung,galaxy,tab",
  "TT002": "lenovo,tab,tablet",          "TT003": "amazon,fire,tablet",
  "TT004": "ipad,pro,large,apple",       "TT005": "huawei,matepad,tablet",
  "TT006": "stylus,pen,digital",         "TT007": "tablet,keyboard,folio",
  "TT008": "xiaomi,pad,tablet",          "TT009": "tablet,stand,adjustable",
  "TT010": "ipad,mini,compact,apple",
  // DEPORTES - FÚTBOL
  "D001":  "soccer,ball,football",       "DF001": "soccer,cleats,boots,grass",
  "DF002": "football,cleats,adidas",     "DF003": "soccer,jersey,sport",
  "DF004": "soccer,socks,sport,long",    "DF005": "shin,guards,leg,protection",
  "DF006": "champions,league,ball",      "DF007": "soccer,goal,post,net",
  "DF008": "ball,pump,sports",           "DF009": "goalkeeper,gloves",
  "DF010": "soccer,shorts,sport",
  // DEPORTES - TENIS
  "D002":  "tennis,racket,court",        "DT001": "tennis,racket,babolat",
  "DT002": "tennis,balls,yellow,can",    "DT003": "tennis,shoes,court",
  "DT004": "tennis,bag,carry",           "DT005": "tennis,grip,tape",
  "DT006": "tennis,string,racket",       "DT007": "wristband,sweatband,sport",
  "DT008": "tennis,racket,junior",       "DT009": "tennis,vibration,dampener",
  "DT010": "tennis,sport,bag",
  // DEPORTES - CICLISMO
  "D003":  "mountain,bike,trail,mtb",    "DC001": "cycling,helmet,road,bike",
  "DC002": "road,bike,racing",           "DC003": "cycling,gloves,padded",
  "DC004": "cycling,gps,computer",       "DC005": "bike,lock,steel,chain",
  "DC006": "bicycle,front,light,led",    "DC007": "floor,pump,bicycle",
  "DC008": "cycling,jersey,shirt",       "DC009": "mountain,bike,tire",
  "DC010": "bicycle,panniers,bag",
  // DEPORTES - BOXEO
  "D004":  "boxing,gloves,red,sport",    "DB001": "punching,bag,heavy,boxing",
  "DB002": "boxing,wraps,hand",          "DB003": "boxing,headgear",
  "DB004": "mouthguard,sport",           "DB005": "boxing,gloves,leather",
  "DB006": "boxing,focus,mitts,pads",    "DB007": "jump,rope,speed,training",
  "DB008": "boxing,shorts,fight",        "DB009": "mma,gloves,grappling",
  "DB010": "groin,cup,protector,sport",
  // DEPORTES - GIMNASIO
  "D005":  "kettlebell,iron,weight,gym", "DG001": "dumbbells,hex,pair,weights",
  "DG002": "yoga,mat,exercise",          "DG003": "treadmill,running,machine",
  "DG004": "resistance,bands,elastic",   "DG005": "squat,rack,power,cage",
  "DG006": "olympic,barbell,weights",    "DG007": "gym,workout,gloves",
  "DG008": "ab,wheel,roller,core",       "DG009": "weight,lifting,belt",
  "DG010": "kettlebell,vinyl,colored",
};

function idToSeed(id) {
  return [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 1000;
}

function withImg(p) {
  const kw = productKeywords[p.id] || "product,store,shelf";
  return { ...p, imagen: `https://loremflickr.com/300/300/${kw}?lock=${idToSeed(p.id)}` };
}

// ─── HELPER: enriquecer producto con nombre de categoría ────────────────────
function enriquecerProducto(p) {
  const cat = categorias.find((c) => c.id === p.categoriaId);
  return { ...p, categoria: cat?.nombre ?? p.categoriaId };
}

// ─── CATEGORÍAS ───────────────────────────────────────────────────────────────

app.get("/api/categorias", (req, res) => {
  res.json(categorias);
});

app.get("/api/categorias/:id", (req, res) => {
  const cat = categorias.find((c) => c.id === req.params.id.toUpperCase());
  if (!cat)
    return res.status(404).json({ error: `Categoría "${req.params.id}" no encontrada` });
  const productosDeCategoria = productos
    .filter((p) => p.categoriaId === cat.id)
    .map(enriquecerProducto);
  res.json({ ...cat, productos: productosDeCategoria });
});

// ─── PRODUCTOS POR CATEGORÍA (con filtros y ordenamiento) ─────────────────────
// GET /api/productos/categoria/:id
//   ?precio_min=N   filtra por precio mínimo
//   ?precio_max=N   filtra por precio máximo
//   ?stock_min=N    filtra por stock mínimo disponible
//   ?ordenar=precio_asc|precio_desc|nombre_asc|nombre_desc|stock_asc|stock_desc
//   ?incluir_sub=true  incluye productos de subcategorías cuando el id es padre
app.get("/api/productos/categoria/:id", (req, res) => {
  const id = req.params.id.toUpperCase();

  // Validar que la categoría existe
  const cat = categorias.find((c) => c.id === id);
  if (!cat)
    return res.status(404).json({ error: `Categoría "${id}" no encontrada` });

  // Recoger IDs a filtrar (categoría propia + hijos si incluir_sub)
  const incluirSub = req.query.incluir_sub === "true";
  const idsAFiltrar = [id];
  if (incluirSub) {
    categorias
      .filter((c) => c.padre === id)
      .forEach((c) => idsAFiltrar.push(c.id));
  }

  // Parsear filtros numéricos
  const precioMin = req.query.precio_min !== undefined ? parseFloat(req.query.precio_min) : null;
  const precioMax = req.query.precio_max !== undefined ? parseFloat(req.query.precio_max) : null;
  const stockMin  = req.query.stock_min  !== undefined ? parseInt(req.query.stock_min)   : null;

  let resultado = productos
    .filter((p) => idsAFiltrar.includes(p.categoriaId))
    .filter((p) => precioMin === null || p.precio >= precioMin)
    .filter((p) => precioMax === null || p.precio <= precioMax)
    .filter((p) => stockMin  === null || p.stock  >= stockMin)
    .map(enriquecerProducto);

  // Ordenamiento
  const ordenar = req.query.ordenar ?? "nombre_asc";
  const ordenMap = {
    precio_asc:  (a, b) => a.precio - b.precio,
    precio_desc: (a, b) => b.precio - a.precio,
    nombre_asc:  (a, b) => a.nombre.localeCompare(b.nombre, "es"),
    nombre_desc: (a, b) => b.nombre.localeCompare(a.nombre, "es"),
    stock_asc:   (a, b) => a.stock - b.stock,
    stock_desc:  (a, b) => b.stock - a.stock,
  };
  const ordenFn = ordenMap[ordenar];
  if (!ordenFn)
    return res.status(400).json({
      error: `Valor "ordenar" inválido. Opciones: ${Object.keys(ordenMap).join(", ")}`,
    });

  resultado.sort(ordenFn);

  res.json({
    categoria:     cat,
    total:         resultado.length,
    filtros:       { precioMin, precioMax, stockMin, incluirSub, ordenar },
    productos:     resultado,
  });
});

// ─── PRODUCTOS ────────────────────────────────────────────────────────────────

app.get("/api/productos", (req, res) => {
  res.json(productos.map(enriquecerProducto));
});

app.get("/api/productos/buscar", (req, res) => {
  const { termino } = req.query;
  if (!termino) return res.status(400).json({ error: 'Parámetro "termino" requerido' });
  const t = termino.toLowerCase();
  const resultado = productos
    .filter((p) => {
      const cat = categorias.find((c) => c.id === p.categoriaId);
      return (
        p.nombre.toLowerCase().includes(t) ||
        (cat?.nombre ?? "").toLowerCase().includes(t) ||
        p.proveedor.toLowerCase().includes(t)
      );
    })
    .map(enriquecerProducto);
  res.json(resultado);
});

app.get("/api/productos/bajo-stock", (req, res) => {
  const umbral = parseInt(req.query.umbral) || 100;
  const resultado = productos
    .filter((p) => p.stock < umbral)
    .sort((a, b) => a.stock - b.stock)
    .map(enriquecerProducto);
  res.json(resultado);
});

app.get("/api/productos/:id", (req, res) => {
  const producto = productos.find((p) => p.id === req.params.id.toUpperCase());
  if (!producto)
    return res.status(404).json({ error: `Producto "${req.params.id}" no encontrado` });
  res.json(enriquecerProducto(producto));
});

// ─── CLIENTES ─────────────────────────────────────────────────────────────────

app.get("/api/clientes", (req, res) => {
  res.json(clientes);
});

app.get("/api/clientes/categoria/:nivel", (req, res) => {
  const nivel = req.params.nivel.toUpperCase();
  if (!["GOLD", "SILVER", "BRONZE"].includes(nivel))
    return res.status(400).json({ error: "Nivel debe ser GOLD, SILVER o BRONZE" });
  const resultado = clientes.filter((c) => c.tarjetaFidelidad === nivel);
  res.json(resultado);
});

app.get("/api/clientes/:id", (req, res) => {
  const cliente = clientes.find((c) => c.id === req.params.id.toUpperCase());
  if (!cliente)
    return res.status(404).json({ error: `Cliente "${req.params.id}" no encontrado` });
  res.json(cliente);
});

// ─── SUCURSALES ───────────────────────────────────────────────────────────────

app.get("/api/sucursales", (req, res) => {
  res.json(sucursales);
});

app.get("/api/sucursales/ciudad/:ciudad", (req, res) => {
  const resultado = sucursales.filter((s) =>
    s.ciudad.toLowerCase().includes(req.params.ciudad.toLowerCase())
  );
  res.json(resultado);
});

// ─── ÓRDENES ──────────────────────────────────────────────────────────────────

app.get("/api/ordenes", (req, res) => {
  res.json(ordenes);
});

app.get("/api/ordenes/cliente/:clienteId", (req, res) => {
  const resultado = ordenes.filter(
    (o) => o.clienteId === req.params.clienteId.toUpperCase()
  );
  res.json(resultado);
});

app.get("/api/ordenes/estado/:estado", (req, res) => {
  const estados = ["pendiente", "en_proceso", "entregado", "cancelado"];
  if (!estados.includes(req.params.estado))
    return res.status(400).json({ error: "Estado inválido" });
  const resultado = ordenes.filter((o) => o.estado === req.params.estado);
  res.json(resultado);
});

// ─── RESUMEN ──────────────────────────────────────────────────────────────────

app.get("/api/resumen", (req, res) => {
  const totalVentas = ordenes
    .filter((o) => o.estado === "entregado")
    .reduce((sum, o) => sum + o.total, 0);

  const conteo = {};
  ordenes.forEach((o) =>
    o.items.forEach((i) => {
      conteo[i.productoId] = (conteo[i.productoId] || 0) + i.cantidad;
    })
  );
  const topId = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0][0];
  const productoMasVendido = productos.find((p) => p.id === topId);
  const clienteTopPuntos = clientes.slice().sort((a, b) => b.puntos - a.puntos)[0];

  res.json({
    totalProductos: productos.length,
    totalClientes: clientes.length,
    totalSucursales: sucursales.length,
    totalOrdenes: ordenes.length,
    ventasEntregadas: ordenes.filter((o) => o.estado === "entregado").length,
    totalIngresosEntregados: `$${totalVentas.toLocaleString("es-CO")} COP`,
    productoMasVendido: productoMasVendido?.nombre,
    clienteConMasPuntos: `${clienteTopPuntos.nombre} (${clienteTopPuntos.puntos} puntos)`,
    productosConStockCritico: productos.filter((p) => p.stock < 100).length,
  });
});

app.listen(PORT, () => {
  console.log(`\n  Interfaz web disponible en → http://localhost:${PORT}\n`);
});
