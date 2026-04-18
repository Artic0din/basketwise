import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Product ────────────────────────────────────────────────────────
export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    brand: varchar("brand", { length: 100 }),
    packSize: varchar("pack_size", { length: 50 }),
    unitOfMeasure: varchar("unit_of_measure", { length: 20 }),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_products_category").on(table.category),
    index("idx_products_name").on(table.name),
  ],
);

export const productsRelations = relations(products, ({ many }) => ({
  storeProducts: many(storeProducts),
  priceRecords: many(priceRecords),
  basketItems: many(basketItems),
  priceAlerts: many(priceAlerts),
  favouriteGroupItems: many(favouriteGroupItems),
}));

// ─── Store ──────────────────────────────────────────────────────────
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  logoUrl: text("logo_url"),
  websiteUrl: text("website_url").notNull(),
});

export const storesRelations = relations(stores, ({ many }) => ({
  storeProducts: many(storeProducts),
  priceRecords: many(priceRecords),
  basketItems: many(basketItems),
  priceAlerts: many(priceAlerts),
}));

// ─── StoreProduct ───────────────────────────────────────────────────
export const storeProducts = pgTable(
  "store_products",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id),
    storeSku: varchar("store_sku", { length: 100 }),
    storeName: varchar("store_name", { length: 255 }).notNull(),
    storeUrl: text("store_url"),
    barcode: varchar("barcode", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uq_store_products_product_store").on(
      table.productId,
      table.storeId,
    ),
  ],
);

export const storeProductsRelations = relations(storeProducts, ({ one }) => ({
  product: one(products, {
    fields: [storeProducts.productId],
    references: [products.id],
  }),
  store: one(stores, {
    fields: [storeProducts.storeId],
    references: [stores.id],
  }),
}));

// ─── PriceRecord ────────────────────────────────────────────────────
export const priceRecords = pgTable(
  "price_records",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    storeId: integer("store_id")
      .notNull()
      .references(() => stores.id),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 4 }),
    unitMeasure: varchar("unit_measure", { length: 20 }),
    isSpecial: boolean("is_special").default(false).notNull(),
    specialType: varchar("special_type", { length: 30 }),
    scrapedAt: timestamp("scraped_at").notNull(),
    date: date("date").notNull(),
  },
  (table) => [
    uniqueIndex("uq_price_records_product_store_date").on(
      table.productId,
      table.storeId,
      table.date,
    ),
    index("idx_price_records_date").on(table.date),
  ],
);

export const priceRecordsRelations = relations(priceRecords, ({ one }) => ({
  product: one(products, {
    fields: [priceRecords.productId],
    references: [products.id],
  }),
  store: one(stores, {
    fields: [priceRecords.storeId],
    references: [stores.id],
  }),
}));

// ─── User ───────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  isPremium: boolean("is_premium").default(false).notNull(),
  premiumExpiresAt: timestamp("premium_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  baskets: many(baskets),
  priceAlerts: many(priceAlerts),
  favouriteGroups: many(favouriteGroups),
}));

// ─── Basket ─────────────────────────────────────────────────────────
export const baskets = pgTable("baskets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 100 }).default("My Basket").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const basketsRelations = relations(baskets, ({ one, many }) => ({
  user: one(users, {
    fields: [baskets.userId],
    references: [users.id],
  }),
  items: many(basketItems),
}));

// ─── BasketItem ─────────────────────────────────────────────────────
export const basketItems = pgTable("basket_items", {
  id: serial("id").primaryKey(),
  basketId: integer("basket_id")
    .notNull()
    .references(() => baskets.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").default(1).notNull(),
  assignedStoreId: integer("assigned_store_id").references(() => stores.id),
});

export const basketItemsRelations = relations(basketItems, ({ one }) => ({
  basket: one(baskets, {
    fields: [basketItems.basketId],
    references: [baskets.id],
  }),
  product: one(products, {
    fields: [basketItems.productId],
    references: [products.id],
  }),
  assignedStore: one(stores, {
    fields: [basketItems.assignedStoreId],
    references: [stores.id],
  }),
}));

// ─── PriceAlert ─────────────────────────────────────────────────────
export const priceAlerts = pgTable("price_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  storeId: integer("store_id").references(() => stores.id),
  targetPrice: numeric("target_price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const priceAlertsRelations = relations(priceAlerts, ({ one }) => ({
  user: one(users, {
    fields: [priceAlerts.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [priceAlerts.productId],
    references: [products.id],
  }),
  store: one(stores, {
    fields: [priceAlerts.storeId],
    references: [stores.id],
  }),
}));

// ─── FavouriteGroup ─────────────────────────────────────────────────
export const favouriteGroups = pgTable("favourite_groups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 100 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const favouriteGroupsRelations = relations(
  favouriteGroups,
  ({ one, many }) => ({
    user: one(users, {
      fields: [favouriteGroups.userId],
      references: [users.id],
    }),
    items: many(favouriteGroupItems),
  }),
);

// ─── FavouriteGroupItem ─────────────────────────────────────────────
export const favouriteGroupItems = pgTable("favourite_group_items", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id")
    .notNull()
    .references(() => favouriteGroups.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
});

export const favouriteGroupItemsRelations = relations(
  favouriteGroupItems,
  ({ one }) => ({
    group: one(favouriteGroups, {
      fields: [favouriteGroupItems.groupId],
      references: [favouriteGroups.id],
    }),
    product: one(products, {
      fields: [favouriteGroupItems.productId],
      references: [products.id],
    }),
  }),
);
