import { pgTable, uuid, varchar, doublePrecision, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Stellar Targets Table (Metadata Layer)
export const stellarTargets = pgTable("stellar_targets", {
  id: uuid("id").defaultRandom().primaryKey(),
  targetName: varchar("target_name", { length: 100 }).notNull().unique(),
  mission: varchar("mission", { length: 50 }).notNull(),
  starMassSolar: doublePrecision("star_mass_solar").notNull(),
  starRadiusSolar: doublePrecision("star_radius_solar").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Highly optimized search index for target query searches
    targetNameIdx: index("idx_target_name").on(table.targetName),
  };
});

// 2. Light Curves Table (Time-Series Array Layer)
export const lightCurves = pgTable("light_curves", {
  id: uuid("id").defaultRandom().primaryKey(),
  targetId: uuid("target_id")
    .references(() => stellarTargets.id, { onDelete: "cascade" })
    .notNull(),
  // Storing pure float arrays processed from Python worker
  timeArray: jsonb("time_array").notNull(), 
  fluxArray: jsonb("flux_array").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Relational Mapping Framework (Drizzle Magic)
export const stellarTargetsRelations = relations(stellarTargets, ({ many }) => ({
  lightCurves: many(lightCurves),
}));

export const lightCurvesRelations = relations(lightCurves, ({ one }) => ({
  target: one(stellarTargets, {
    fields: [lightCurves.targetId],
    references: [stellarTargets.id],
  }),
}));
