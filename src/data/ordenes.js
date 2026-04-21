export const ordenes = [
  {
    id: "O001", clienteId: "C001", sucursalId: "S001", fecha: "2026-03-28",
    estado: "entregado", total: 67400,
    items: [
      { productoId: "P001", cantidad: 3, precioUnitario: 3200 },
      { productoId: "P003", cantidad: 4, precioUnitario: 4800 },
      { productoId: "P006", cantidad: 2, precioUnitario: 8500 },
      { productoId: "P009", cantidad: 3, precioUnitario: 3800 }
    ]
  },
  {
    id: "O002", clienteId: "C003", sucursalId: "S002", fecha: "2026-03-30",
    estado: "entregado", total: 89500,
    items: [
      { productoId: "P005", cantidad: 2, precioUnitario: 21000 },
      { productoId: "P007", cantidad: 1, precioUnitario: 23000 },
      { productoId: "P010", cantidad: 1, precioUnitario: 15900 },
      { productoId: "P004", cantidad: 1, precioUnitario: 6900 }
    ]
  },
  {
    id: "O003", clienteId: "C005", sucursalId: "S001", fecha: "2026-04-01",
    estado: "en_proceso", total: 58600,
    items: [
      { productoId: "P002", cantidad: 2, precioUnitario: 12500 },
      { productoId: "P013", cantidad: 2, precioUnitario: 8600 },
      { productoId: "P011", cantidad: 3, precioUnitario: 5200 }
    ]
  },
  {
    id: "O004", clienteId: "C006", sucursalId: "S004", fecha: "2026-04-02",
    estado: "entregado", total: 81000,
    items: [
      { productoId: "P015", cantidad: 1, precioUnitario: 32000 },
      { productoId: "P014", cantidad: 1, precioUnitario: 18500 },
      { productoId: "P008", cantidad: 2, precioUnitario: 4500 },
      { productoId: "P006", cantidad: 3, precioUnitario: 8500 }
    ]
  },
  {
    id: "O005", clienteId: "C002", sucursalId: "S003", fecha: "2026-04-03",
    estado: "pendiente", total: 34200,
    items: [
      { productoId: "P001", cantidad: 2, precioUnitario: 3200 },
      { productoId: "P003", cantidad: 2, precioUnitario: 4800 },
      { productoId: "P004", cantidad: 2, precioUnitario: 6900 },
      { productoId: "P012", cantidad: 1, precioUnitario: 9800 }
    ]
  }
];
