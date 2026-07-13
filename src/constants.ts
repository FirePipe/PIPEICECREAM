import { Product, ShopConfig } from "./types";

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "PROD-1",
    nombre: "Queso Bocadillo",
    precio: 2200,
    costo: 1140,
    stock: 0,
    imagen: "https://lh3.googleusercontent.com/d/1W9ZtSzMXJY7lC93En7h9z9F1NC41-IX3"
  },
  {
    id: "PROD-2",
    nombre: "Coco",
    precio: 2200,
    costo: 1140,
    stock: 0,
    imagen: "https://lh3.googleusercontent.com/d/1NYj2eM6mWBOMwsFh8kluqgkLICI3AjHd"
  },
  {
    id: "PROD-3",
    nombre: "Salpicon",
    precio: 2200,
    costo: 1140,
    stock: 0,
    imagen: "https://lh3.googleusercontent.com/d/1GiLJ4mJQlM_PLTMl9nM9KIQwBqQ_DfLw"
  },
  {
    id: "PROD-4",
    nombre: "ChocoVainilla",
    precio: 2200,
    costo: 1140,
    stock: 0,
    imagen: "https://lh3.googleusercontent.com/d/18lJnx9HSQ8sW7pWQ8nBPZJNtfxxW-4OM"
  },
  {
    id: "PROD-5",
    nombre: "Ron & Pasas",
    precio: 2200,
    costo: 1140,
    stock: 3,
    imagen: "https://lh3.googleusercontent.com/d/1xp3eILHmEgilmBCxwacyKm36oiGiPBtL"
  },
  {
    id: "PROD-6",
    nombre: "Mani",
    precio: 2200,
    costo: 1140,
    stock: 3,
    imagen: "https://lh3.googleusercontent.com/d/1HPUpv6N2cRoK5gWa1u3BEGGjddhSP_xx"
  },
  {
    id: "PROD-7",
    nombre: "Chicle",
    precio: 2200,
    costo: 1140,
    stock: 0,
    imagen: "https://lh3.googleusercontent.com/d/19gAyeGotqO_tRIuS--M4QGWr8HKtBUbb"
  },
  {
    id: "PROD-8",
    nombre: "Helado Mango Biche",
    precio: 2200,
    costo: 920,
    stock: 0,
    imagen: "https://lh3.googleusercontent.com/d/171saTSIh_oNyGc-ljUwQkML7URKro_0n"
  },
  {
    id: "PROD-9",
    nombre: "Fresa",
    precio: 2200,
    costo: 1140,
    stock: 0,
    imagen: "https://lh3.googleusercontent.com/d/1b23jVJoWzBaBySx8GbkR3OdW9QCdb4eF"
  },
  {
    id: "PROD-10",
    nombre: "Guanabana",
    precio: 2200,
    costo: 1140,
    stock: 0,
    imagen: "https://lh3.googleusercontent.com/d/1T4RKTW92Mnjo3MM8OD8AXQQA0QymnFWn"
  }
];

export const DEFAULT_CONFIG: ShopConfig = {
  tiendaNombre: "PIPE ICE CREAM",
  contrasenaAdmin: "PipeAdmin2026",
  metodoOrdenar: "Atención rápida y pedidos fáciles",
  cuentaNumero: "3184754263",
  cuentaTitular: "Alba Guaca",
  whatsappNumero: "3185074440",
  mostrarReloj: false,
  mostrarClima: false,
  syncEnabled: true,
  catalogSortOrder: "manual"
};
