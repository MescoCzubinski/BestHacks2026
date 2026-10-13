import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { STYLE_TAGS, type StyleTag } from "../common/types/style-tag";
import { Place } from "./place.entity";

@Entity("place_tags")
export class PlaceTag {
  @PrimaryColumn("uuid", { name: "place_id" })
  placeId: string;

  @PrimaryColumn({ type: "enum", enum: STYLE_TAGS, enumName: "style_tag" })
  tag: StyleTag;

  @Column("smallint")
  percent: number;

  @ManyToOne(() => Place, (place) => place.tags)
  @JoinColumn({ name: "place_id" })
  place: Place;
}
