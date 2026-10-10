import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Place } from "./place.entity";
import { STYLE_TAGS, type StyleTag } from "./style-tag";

@Entity("place_tags")
@Check(`"percent" BETWEEN 0 AND 100`)
@Index(["tag", "percent"])
export class PlaceTag {
  @PrimaryColumn("uuid", { name: "place_id" })
  placeId: string;

  @PrimaryColumn({ type: "enum", enum: STYLE_TAGS, enumName: "style_tag" })
  tag: StyleTag;

  @Column("smallint")
  percent: number;

  @ManyToOne(() => Place, (place) => place.tags, { onDelete: "CASCADE" })
  @JoinColumn({ name: "place_id" })
  place: Place;
}
