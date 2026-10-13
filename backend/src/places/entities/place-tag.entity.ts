import { Column, Entity, PrimaryColumn } from "typeorm";
import { STYLE_TAGS, type StyleTag } from "../../common/types/style-tag";

@Entity("place_tags")
export class PlaceTag {
  @PrimaryColumn("uuid", { name: "place_id" })
  placeId: string;

  @PrimaryColumn({ type: "enum", enum: STYLE_TAGS, enumName: "style_tag" })
  tag: StyleTag;

  @Column("smallint")
  percent: number;
}
