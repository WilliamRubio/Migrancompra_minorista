import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { productos } from "./data/productos.js";
import { clientes } from "./data/clientes.js";
import { sucursales } from "./data/sucursales.js";
import { ordenes } from "./data/ordenes.js";

const server = new McpServer({
  name: "minorista-mcp",
  version: "1.0.0",
  description: "Base de datos simulada de una empresa minorista tipo Éxito"
});

// ─── HERRAMIENTAS DE PRODUCTOS ───────────────────────────────────────────────

server.tool(
  "listar_productos",
  "Lista todos los productos del catálogo",
  {},
  async () => ({
    content: [{
      type: "text",
      text: JSON.stringify(productos, null, 2)
    }]
  })
);

server.tool(
  "buscar_producto",
  "Busca productos por nombre o categoría",
  { termino: z.string().describe("Nombre o categoría a buscar") },
  async ({ termino }) => {
    const t = termino.toLowerCase();
    const resultado = productos.filter(p =>
      p.nombre.toLowerCase().includes(t) ||
      p.categoria.toLowerCase().includes(t) ||
      p.proveedor.toLowerCase().includes(t)
    );
    return {
      content: [{
        type: "text",
        text: resultado.length
          ? JSON.stringify(resultado, null, 2)
          : `No se encontraron productos con el término "${termino}"`
      }]
    };
  }
);

server.tool(
  "obtener_producto",
  "Obtiene el detalle de un producto por su ID",
  { id: z.string().describe("ID del producto (ej: P001)") },
  async ({ id }) => {
    const producto = productos.find(p => p.id === id.toUpperCase());
    return {
      content: [{
        type: "text",
        text: producto
          ? JSON.stringify(producto, null, 2)
          : `Producto con ID "${id}" no encontrado`
      }]
    };
  }
);

server.tool(
  "productos_bajo_stock",
  "Lista los productos con stock por debajo de un umbral",
  { umbral: z.number().int().min(1).describe("Cantidad mínima de stock (ej: 100)") },
  async ({ umbral }) => {
    const resultado = productos
      .filter(p => p.stock < umbral)
      .sort((a, b) => a.stock - b.stock);
    return {
      content: [{
        type: "text",
        text: resultado.length
          ? JSON.stringify(resultado, null, 2)
          : `Todos los productos tienen stock mayor a ${umbral}`
      }]
    };
  }
);

// ─── HERRAMIENTAS DE CLIENTES ────────────────────────────────────────────────

server.tool(
  "listar_clientes",
  "Lista todos los clientes registrados",
  {},
  async () => ({
    content: [{
      type: "text",
      text: JSON.stringify(clientes, null, 2)
    }]
  })
);

server.tool(
  "obtener_cliente",
  "Obtiene el detalle de un cliente por su ID",
  { id: z.string().describe("ID del cliente (ej: C001)") },
  async ({ id }) => {
    const cliente = clientes.find(c => c.id === id.toUpperCase());
    return {
      content: [{
        type: "text",
        text: cliente
          ? JSON.stringify(cliente, null, 2)
          : `Cliente con ID "${id}" no encontrado`
      }]
    };
  }
);

server.tool(
  "clientes_por_categoria",
  "Lista los clientes según su nivel de tarjeta de fidelidad",
  {
    nivel: z.enum(["GOLD", "SILVER", "BRONZE"])
      .describe("Nivel de tarjeta: GOLD, SILVER o BRONZE")
  },
  async ({ nivel }) => {
    const resultado = clientes.filter(c => c.tarjetaFidelidad === nivel);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(resultado, null, 2)
      }]
    };
  }
);

// ─── HERRAMIENTAS DE SUCURSALES ──────────────────────────────────────────────

server.tool(
  "listar_sucursales",
  "Lista todas las sucursales de la empresa",
  {},
  async () => ({
    content: [{
      type: "text",
      text: JSON.stringify(sucursales, null, 2)
    }]
  })
);

server.tool(
  "sucursales_por_ciudad",
  "Lista las sucursales de una ciudad específica",
  { ciudad: z.string().describe("Nombre de la ciudad (ej: Bogotá, Medellín)") },
  async ({ ciudad }) => {
    const resultado = sucursales.filter(s =>
      s.ciudad.toLowerCase().includes(ciudad.toLowerCase())
    );
    return {
      content: [{
        type: "text",
        text: resultado.length
          ? JSON.stringify(resultado, null, 2)
          : `No hay sucursales en "${ciudad}"`
      }]
    };
  }
);

// ─── HERRAMIENTAS DE ÓRDENES ─────────────────────────────────────────────────

server.tool(
  "listar_ordenes",
  "Lista todas las órdenes de compra",
  {},
  async () => ({
    content: [{
      type: "text",
      text: JSON.stringify(ordenes, null, 2)
    }]
  })
);

server.tool(
  "ordenes_por_cliente",
  "Lista las órdenes de un cliente específico",
  { clienteId: z.string().describe("ID del cliente (ej: C001)") },
  async ({ clienteId }) => {
    const resultado = ordenes.filter(o => o.clienteId === clienteId.toUpperCase());
    return {
      content: [{
        type: "text",
        text: resultado.length
          ? JSON.stringify(resultado, null, 2)
          : `No se encontraron órdenes para el cliente "${clienteId}"`
      }]
    };
  }
);

server.tool(
  "ordenes_por_estado",
  "Lista las órdenes filtradas por estado",
  {
    estado: z.enum(["pendiente", "en_proceso", "entregado", "cancelado"])
      .describe("Estado de la orden")
  },
  async ({ estado }) => {
    const resultado = ordenes.filter(o => o.estado === estado);
    return {
      content: [{
        type: "text",
        text: resultado.length
          ? JSON.stringify(resultado, null, 2)
          : `No hay órdenes con estado "${estado}"`
      }]
    };
  }
);

// ─── HERRAMIENTA DE RESUMEN ──────────────────────────────────────────────────

server.tool(
  "resumen_negocio",
  "Muestra un resumen general del estado del negocio",
  {},
  async () => {
    const totalVentas = ordenes
      .filter(o => o.estado === "entregado")
      .reduce((sum, o) => sum + o.total, 0);

    const productoMasVendido = (() => {
      const conteo = {};
      ordenes.forEach(o =>
        o.items.forEach(i => {
          conteo[i.productoId] = (conteo[i.productoId] || 0) + i.cantidad;
        })
      );
      const topId = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0][0];
      return productos.find(p => p.id === topId);
    })();

    const clienteTopPuntos = clientes
      .slice()
      .sort((a, b) => b.puntos - a.puntos)[0];

    const resumen = {
      totalProductos: productos.length,
      totalClientes: clientes.length,
      totalSucursales: sucursales.length,
      totalOrdenes: ordenes.length,
      ventasEntregadas: ordenes.filter(o => o.estado === "entregado").length,
      totalIngresosEntregados: `$${totalVentas.toLocaleString("es-CO")} COP`,
      productoMasVendido: productoMasVendido?.nombre,
      clienteConMasPuntos: `${clienteTopPuntos.nombre} (${clienteTopPuntos.puntos} puntos)`,
      productosConStockCritico: productos.filter(p => p.stock < 100).length
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(resumen, null, 2)
      }]
    };
  }
);

// ─── INICIO DEL SERVIDOR ─────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
