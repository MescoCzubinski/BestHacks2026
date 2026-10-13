import { Column, Entity, PrimaryColumn } from "typeorm";
import type { Bbox } from "../../common/types/geo";

@Entity("supported_cities")
export class City {
  @PrimaryColumn("uuid")
  id: string;

  @Column("text")
  name: string;

  @Column("text")
  region: string;

  @Column("double precision")
  latitude: number;

  @Column("double precision")
  longitude: number;

  @Column("jsonb")
  bbox: Bbox;

  @Column("timestamptz", { name: "updated_at" })
  updatedAt: Date;
}
