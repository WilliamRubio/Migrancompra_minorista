export const categorias = [

  // ══════════════════════════════════════════════════════════
  // CATEGORÍAS PADRE
  // ══════════════════════════════════════════════════════════
  { id: "ALM", nombre: "Alimentos",  padre: null, descripcion: "Productos alimenticios, aseo y cuidado personal" },
  { id: "TEC", nombre: "Tecnología", padre: null, descripcion: "Electrónica y dispositivos tecnológicos" },
  { id: "DEP", nombre: "Deportes",   padre: null, descripcion: "Equipos, indumentaria y accesorios deportivos" },

  // ══════════════════════════════════════════════════════════
  // SUBCATEGORÍAS — ALIMENTOS
  // ══════════════════════════════════════════════════════════
  { id: "GC",  nombre: "Granos y Cereales", padre: "ALM", descripcion: "Arroz, legumbres, avena, quinua y cereales" },
  { id: "AC",  nombre: "Aceites",           padre: "ALM", descripcion: "Aceites vegetales, de oliva, coco y cocina" },
  { id: "LAC", nombre: "Lácteos",           padre: "ALM", descripcion: "Leche, queso, yogur, mantequilla y derivados" },
  { id: "PAN", nombre: "Panadería",         padre: "ALM", descripcion: "Pan, galletas, ponqués y productos horneados" },
  { id: "CAR", nombre: "Carnes",            padre: "ALM", descripcion: "Carnes frescas, embutidos y mariscos" },
  { id: "BEB", nombre: "Bebidas",           padre: "ALM", descripcion: "Gaseosas, jugos, agua, café y bebidas calientes" },
  { id: "AH",  nombre: "Aseo del Hogar",    padre: "ALM", descripcion: "Detergentes, desinfectantes y productos de limpieza" },
  { id: "HP",  nombre: "Higiene Personal",  padre: "ALM", descripcion: "Jabones, shampoo, cremas y cuidado personal" },
  { id: "SN",  nombre: "Snacks",            padre: "ALM", descripcion: "Papas fritas, maní, galletas dulces y bocadillos" },
  { id: "EN",  nombre: "Enlatados",         padre: "ALM", descripcion: "Conservas, atún, verduras y alimentos enlatados" },
  { id: "BB",  nombre: "Bebé",              padre: "ALM", descripcion: "Pañales, fórmulas, compotas y artículos para bebé" },

  // ══════════════════════════════════════════════════════════
  // SUBCATEGORÍAS — TECNOLOGÍA
  // ══════════════════════════════════════════════════════════
  { id: "TC",  nombre: "Computadores", padre: "TEC", descripcion: "Laptops, PCs de escritorio, monitores y periféricos" },
  { id: "TF",  nombre: "Celulares",    padre: "TEC", descripcion: "Smartphones, fundas, cargadores y accesorios móviles" },
  { id: "TV",  nombre: "Televisores",  padre: "TEC", descripcion: "Smart TV 4K, QLED, OLED y soportes" },
  { id: "TA",  nombre: "Audio",        padre: "TEC", descripcion: "Audífonos, parlantes bluetooth y sistemas de sonido" },
  { id: "TT",  nombre: "Tablets",      padre: "TEC", descripcion: "iPads, tabletas Android y accesorios" },

  // ══════════════════════════════════════════════════════════
  // SUBCATEGORÍAS — DEPORTES
  // ══════════════════════════════════════════════════════════
  { id: "DF",  nombre: "Fútbol",    padre: "DEP", descripcion: "Balones, guayos, camisetas y accesorios de fútbol" },
  { id: "DT",  nombre: "Tenis",     padre: "DEP", descripcion: "Raquetas, pelotas y accesorios de tenis" },
  { id: "DC",  nombre: "Ciclismo",  padre: "DEP", descripcion: "Bicicletas, cascos, accesorios y ropa ciclista" },
  { id: "DB",  nombre: "Boxeo",     padre: "DEP", descripcion: "Guantes, sacos, cascos y accesorios de boxeo y MMA" },
  { id: "DG",  nombre: "Gimnasio",  padre: "DEP", descripcion: "Pesas, colchonetas, máquinas y ropa deportiva" },
];
