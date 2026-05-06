-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "tarjetaFidelidad" TEXT NOT NULL,
    "puntos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sucursal" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "empleados" INTEGER NOT NULL,
    "horario" TEXT NOT NULL,

    CONSTRAINT "Sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orden" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT,
    "usuarioId" TEXT,
    "sucursalId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "direccion" TEXT,
    "metodoPago" TEXT,

    CONSTRAINT "Orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenItem" (
    "id" SERIAL NOT NULL,
    "ordenId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" INTEGER NOT NULL,

    CONSTRAINT "OrdenItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_email_key" ON "Cliente"("email");

-- CreateIndex
CREATE INDEX "Cliente_tarjetaFidelidad_idx" ON "Cliente"("tarjetaFidelidad");

-- CreateIndex
CREATE INDEX "Cliente_ciudad_idx" ON "Cliente"("ciudad");

-- CreateIndex
CREATE INDEX "Sucursal_ciudad_idx" ON "Sucursal"("ciudad");

-- CreateIndex
CREATE INDEX "Orden_clienteId_idx" ON "Orden"("clienteId");

-- CreateIndex
CREATE INDEX "Orden_usuarioId_idx" ON "Orden"("usuarioId");

-- CreateIndex
CREATE INDEX "Orden_sucursalId_idx" ON "Orden"("sucursalId");

-- CreateIndex
CREATE INDEX "Orden_estado_idx" ON "Orden"("estado");

-- CreateIndex
CREATE INDEX "OrdenItem_ordenId_idx" ON "OrdenItem"("ordenId");

-- CreateIndex
CREATE INDEX "OrdenItem_productoId_idx" ON "OrdenItem"("productoId");

-- AddForeignKey
ALTER TABLE "Orden" ADD CONSTRAINT "Orden_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orden" ADD CONSTRAINT "Orden_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orden" ADD CONSTRAINT "Orden_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenItem" ADD CONSTRAINT "OrdenItem_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "Orden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenItem" ADD CONSTRAINT "OrdenItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
