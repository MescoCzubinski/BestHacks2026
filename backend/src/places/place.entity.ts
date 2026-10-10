import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Address } from "./address";
import { PlaceTag } from "./place-tag.entity";

@Entity("places")
export class Place {
  @PrimaryGeneratedColumn("uuid")
  id: string;

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
