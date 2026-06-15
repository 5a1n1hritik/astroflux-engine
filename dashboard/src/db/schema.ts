import { pgTable, uuid, varchar, doublePrecision, timestamp, jsonb, index, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Stellar Targets Table (Metadata Layer)
export const stellarTargets = pgTable("stellar_targets", {
  id: uuid("id").defaultRandom().primaryKey(),
  targetName: varchar("target_name", { length: 100 }).notNull().unique(), // pl_name
  hostName: varchar("host_name", { length: 100 }),
  mission: varchar("mission", { length: 50 }).notNull(),  // old field

  orbitalPeriod: doublePrecision("pl_orbper"),   // Days
  semiMajorAxis: doublePrecision("pl_orbsmax"),   // AU
  eccentricity: doublePrecision("pl_orbeccen"),  // Ellipse factor
  orbitalInclination: doublePrecision("pl_orbincl"), // Angular Tilt (Degrees)

  planetRadius: doublePrecision("pl_rade"),      // Earth Radii Multiplier
  planetMass: doublePrecision("pl_masse"),       // Earth Mass Multiplier
  equilibriumTemperature: doublePrecision("pl_eqt"), // Kelvin
  insolationFlux: doublePrecision("pl_insol"),   // Radiation intensity vs Earth
  
  starMassSolar: doublePrecision("star_mass_solar").notNull(),  // old field
  starRadiusSolar: doublePrecision("star_radius_solar").notNull(),  //old field
  starMass: doublePrecision("st_mass"),          // TAP Dynamic Star Mass (Solar Mass Multiplier)
  starRadius: doublePrecision("st_rad"),         // TAP Dynamic Star Radius (Solar Radii Multiplier)
  starTemperature: doublePrecision("st_teff"),   // GLSL Plasma Color core trigger (Kelvin)
  starLuminosity: doublePrecision("st_lum"),     // Habitable zone width scaling index

  starAge: doublePrecision("st_age"),            // Billion Years (Giga-Years)
  starLogg: doublePrecision("st_logg"),          // Stellar Gravity log(g)
  starSpecType: varchar("st_spectype", { length: 20 }), // Spectral class string (e.g., "G2")
  systemDistance: doublePrecision("sy_dist"),    // Distance from Earth (Parsecs)
  systemPlanetsCount: integer("sy_pnum"),        // Multi-planet navigation selector sync counter

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

  // Storing pure float arrays processed from Python worker (Both MAST and TAP compliant)
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
