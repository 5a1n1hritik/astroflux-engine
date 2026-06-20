import { pgTable, uuid, varchar, doublePrecision, timestamp, jsonb, index, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── 1. STAR SYSTEMS TABLE (THE CORE SYSTEM MASTER LAYER) ───────────────────
export const starSystems = pgTable("star_systems", {
  id: uuid("id").defaultRandom().primaryKey(),
  systemId: varchar("system_id", { length: 100 }).notNull().unique(), // E.g., "Kepler-90" or "TRAPPIST-1"
  canonicalName: varchar("canonical_name", { length: 100 }).notNull(),
  
  // Space Location Matrix (Rich Meta Data)
  distanceParsecs: doublePrecision("distance_parsecs"),
  distanceLightYears: doublePrecision("distance_light_years"),
  rightAscensionDeg: doublePrecision("right_ascension_deg"),
  declinationDeg: doublePrecision("declination_deg"),
  galacticLongitudeDeg: doublePrecision("galactic_longitude_deg"),
  galacticLatitudeDeg: doublePrecision("galactic_latitude_deg"),
  
  // 3D Cartesian Position Vectors for Three.js Viewport Cam Positioning
  vectorX: doublePrecision("vector_x"),
  vectorY: doublePrecision("vector_y"),
  vectorZ: doublePrecision("vector_z"),
  
  // Host Star Physical Parameters
  spectralType: varchar("spectral_type", { length: 20 }), // E.g., "G2V"
  massSolar: doublePrecision("mass_solar"),
  radiusSolar: doublePrecision("radius_solar"),
  temperatureKelvin: doublePrecision("temperature_kelvin"),
  luminosityLog: doublePrecision("luminosity_log"),
  surfaceGravityLogg: doublePrecision("surface_gravity_logg"),
  metallicityDex: doublePrecision("metallicity_dex"),
  rotationPeriodDays: doublePrecision("rotation_period_days"),
  estimatedAgeGyr: doublePrecision("estimated_age_gyr"),
  
  totalPlanets: integer("total_planets_count").default(1),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    systemIdIdx: index("idx_star_system_id").on(table.systemId),
  };
});

// ── 2. PLANETARY BODIES TABLE (THE MULTI-BODY ORBIT LAYER) ─────────────────
export const planetaryBodies = pgTable("planetary_bodies", {
  id: uuid("id").defaultRandom().primaryKey(),
  systemId: uuid("system_id")
    .references(() => starSystems.id, { onDelete: "cascade" })
    .notNull(),
    
  planetName: varchar("planet_name", { length: 100 }).notNull().unique(), // E.g., "Kepler-90 h"
  classificationType: varchar("classification_type", { length: 100 }),   // E.g., "Super-Earth"
  
  // Keplerian Orbital Physics Engine Constants
  radiusEarth: doublePrecision("radius_earth"),
  massEarth: doublePrecision("mass_earth"),
  semiMajorAxisAu: doublePrecision("semi_major_axis_au"),
  eccentricity: doublePrecision("eccentricity").default(0.0),
  orbitalPeriodDays: doublePrecision("orbital_period_days"),
  inclinationDegrees: doublePrecision("inclination_degrees").default(90.0),
  equilibriumTemperatureK: doublePrecision("equilibrium_temperature_k"),
  insolationFluxEarth: doublePrecision("insolation_flux_earth"),
  transitDepthPercent: doublePrecision("transit_depth_percent").default(0.0),
  
  // Discovery Metrics
  discoveryYear: integer("discovery_year"),
  discoveryFacility: varchar("discovery_facility", { length: 100 }),
  isDefaultSolution: integer("is_default_solution").default(1),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    planetNameIdx: index("idx_planet_name").on(table.planetName),
  };
});

// ── 3. LIGHT CURVES TABLE (TIME-SERIES PHOTOMETRY ARRAY LAYER) ─────────────
export const lightCurves = pgTable("light_curves", {
  id: uuid("id").defaultRandom().primaryKey(),
  planetId: uuid("planet_id")
    .references(() => planetaryBodies.id, { onDelete: "cascade" })
    .notNull(),

  // Storing high-density streams from python data-worker arrays cleanly
  timeArray: jsonb("time_array").notNull(), 
  fluxArray: jsonb("flux_array").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── 4. DRIZZLE RELATIONAL MAPPING FRAMEWORK ────────────────────────────────
export const starSystemsRelations = relations(starSystems, ({ many }) => ({
  planets: many(planetaryBodies),
}));

export const planetaryBodiesRelations = relations(planetaryBodies, ({ one, many }) => ({
  system: one(starSystems, {
    fields: [planetaryBodies.systemId],
    references: [starSystems.id],
  }),
  lightCurves: many(lightCurves),
}));

export const lightCurvesRelations = relations(lightCurves, ({ one }) => ({
  planet: one(planetaryBodies, {
    fields: [lightCurves.planetId],
    references: [planetaryBodies.id],
  }),
}));
