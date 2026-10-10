import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Address } from "./address";
import type { PlaceFacts, PlaceLinks, PositionQuality } from "./place-facts";
import { PlaceTag } from "./place-tag.entity";

@Entity("places")
export class Place {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Stable id from the data pipeline (e.g. "wr-00917"); lets re-imports upsert instead of duplicate. */
  @Index({ unique: true })
  @Column("text", { name: "external_id", nullable: true })
  externalId: string | null;

  @Column("text")
  name: string;

  @Column("double precision")
  latitude: number;

  @Column("double precision")
  longitude: number;

  @Column("text", { nullable: true })
  description: string | null;

  @Column("jsonb")
  address: Address;

  /** How trustworthy the coordinates are; routing should prefer address/point over centroid. */
  @Column("text", { name: "position_quality", default: "point" })
  positionQuality: PositionQuality;

  /** Year of construction/creation when known. */
  @Column("smallint", { nullable: true })
  year: number | null;

  /** Free-text date as published ("XVIII w.", "1903 r."). */
  @Column("text", { name: "date_text", nullable: true })
  dateText: string | null;

  /** 0-100 "worth a stop" score (photo, description, protection, number of sources); used to rank when fitting a time budget. */
  @Index()
  @Column("smallint", { default: 0 })
  significance: number;

  /** Raw attributes we keep for the story card (original style label, function, material, protection...). */
  @Column("jsonb", { default: () => "'{}'" })
  facts: PlaceFacts;

  @Column("jsonb", { default: () => "'{}'" })
  links: PlaceLinks;

  /** Datasets this record was merged from (osm, wikidata, nid, wroclaw_gis). */
  @Column("text", { array: true, default: () => "'{}'" })
  sources: string[];

  @Column("text", { name: "main_image_url", nullable: true })
  mainImageUrl: string | null;

  @Column("text", { array: true, default: () => "'{}'" })
  images: string[];

  @OneToMany(() => PlaceTag, (tag) => tag.place, { cascade: true })
  tags: PlaceTag[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
