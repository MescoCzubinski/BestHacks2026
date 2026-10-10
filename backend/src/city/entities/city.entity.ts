import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Bbox } from "../bbox";

/** A city the app has data for; addresses are only accepted inside its bbox. */
@Entity("supported_cities")
export class City {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index({ unique: true })
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

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
