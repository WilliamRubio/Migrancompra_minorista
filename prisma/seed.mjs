import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "node:crypto";

import { categorias } from "../src/data/categorias.js";
import { productos } from "../src/data/productos.js";
import { clientes } from "../src/data/clientes.js";
import { sucursales } from "../src/data/sucursales.js";
import { ordenes } from "../src/data/ordenes.js";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  await prisma.categoria.createMany({ data: categorias, skipDuplicates: true });
  await prisma.producto.createMany({ data: productos, skipDuplicates: true });
  await prisma.cliente.createMany({ data: clientes, skipDuplicates: true });
  await prisma.sucursal.createMany({ data: sucursales, skipDuplicates: true });

  const usuariosDemo = [
    {
      id: "U001",
      nombre: "Carlos Pérez",
      email: "carlos@demo.com",
      passwordHash: hashPassword("Demo1234"),
      tarjetaFidelidad: "GOLD",
      puntos: 1500,
    },
    {
      id: "U002",
      nombre: "María López",
      email: "maria@demo.com",
      passwordHash: hashPassword("Demo1234"),
      tarjetaFidelidad: "SILVER",
      puntos: 800,
    },
  ];

  for (const user of usuariosDemo) {
    const existing = await prisma.usuario.findUnique({ where: { id: user.id } });
    if (!existing) {
      await prisma.usuario.create({ data: user });
    }
  }

  for (const orden of ordenes) {
    await prisma.orden.upsert({
      where: { id: orden.id },
      update: {
        clienteId: orden.clienteId,
        sucursalId: orden.sucursalId,
        fecha: new Date(`${orden.fecha}T00:00:00.000Z`),
        estado: orden.estado,
        total: orden.total,
      },
      create: {
        id: orden.id,
        clienteId: orden.clienteId,
        sucursalId: orden.sucursalId,
        fecha: new Date(`${orden.fecha}T00:00:00.000Z`),
        estado: orden.estado,
        total: orden.total,
      },
    });

    await prisma.ordenItem.deleteMany({ where: { ordenId: orden.id } });
    await prisma.ordenItem.createMany({
      data: orden.items.map((item) => ({
        ordenId: orden.id,
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
      })),
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
