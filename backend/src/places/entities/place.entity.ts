import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import type { Address } from "./address";
import type { PlaceFacts, PlaceLinks, PositionQuality } from "./place-facts";
import { PlaceTag } from "./place-tag.entity";

@Entity("places")
export class Place {
  @PrimaryColumn("uuid")
  id: string;

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

  @Column("text", { name: "position_quality" })
  positionQuality: PositionQuality;

  @Column("smallint", { nullable: true })
  year: number | null;

  @Column("text", { name: "date_text", nullable: true })
  dateText: string | null;

  @Column("smallint")
  significance: number;

  @Column("jsonb")
  facts: PlaceFacts;

  @Column("jsonb")
  links: PlaceLinks;

  @Column("text", { array: true })
  sources: string[];

  @Column("text", { name: "main_image_url", nullable: true })
  mainImageUrl: string | null;

  @Column("text", { array: true })
  images: string[];

  @OneToMany(() => PlaceTag, (tag) => tag.place)
  tags: PlaceTag[];

  @Column("timestamptz", { name: "updated_at" })
  updatedAt: Date;
}
