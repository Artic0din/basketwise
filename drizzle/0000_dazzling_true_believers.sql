CREATE TABLE "basket_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"basket_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"assigned_store_id" integer
);
--> statement-breakpoint
CREATE TABLE "baskets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) DEFAULT 'My Basket' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favourite_group_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"product_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favourite_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"store_id" integer,
	"target_price" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 4),
	"unit_measure" varchar(20),
	"is_special" boolean DEFAULT false NOT NULL,
	"special_type" varchar(30),
	"scraped_at" timestamp NOT NULL,
	"date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"brand" varchar(100),
	"pack_size" varchar(50),
	"unit_of_measure" varchar(20),
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"store_sku" varchar(100),
	"store_name" varchar(255) NOT NULL,
	"store_url" text,
	"barcode" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"logo_url" text,
	"website_url" text NOT NULL,
	CONSTRAINT "stores_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"premium_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "basket_items" ADD CONSTRAINT "basket_items_basket_id_baskets_id_fk" FOREIGN KEY ("basket_id") REFERENCES "public"."baskets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "basket_items" ADD CONSTRAINT "basket_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "basket_items" ADD CONSTRAINT "basket_items_assigned_store_id_stores_id_fk" FOREIGN KEY ("assigned_store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baskets" ADD CONSTRAINT "baskets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourite_group_items" ADD CONSTRAINT "favourite_group_items_group_id_favourite_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."favourite_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourite_group_items" ADD CONSTRAINT "favourite_group_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourite_groups" ADD CONSTRAINT "favourite_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_records" ADD CONSTRAINT "price_records_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_records" ADD CONSTRAINT "price_records_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_price_records_product_store_date" ON "price_records" USING btree ("product_id","store_id","date");--> statement-breakpoint
CREATE INDEX "idx_price_records_date" ON "price_records" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_products_name" ON "products" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_store_products_product_store" ON "store_products" USING btree ("product_id","store_id");