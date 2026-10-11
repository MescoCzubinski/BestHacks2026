import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { LatLng } from "../../city/bbox";

export type SavedStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  visitMinutes: number;
};

export type SavedRouteData = {
  tags: string[];
  start: LatLng;
  end: LatLng;
  stops: SavedStop[];
};

@Entity("saved_routes")
export class SavedRoute {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column("uuid", { name: "user_id" })
  userId: string;

  @Column("text")
  title: string;

  @Column("text", { nullable: true })
  city: string | null;

  @Column("integer", { name: "duration_minutes" })
  durationMinutes: number;

  @Column("jsonb")
  data: SavedRouteData;

  @Index()
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
