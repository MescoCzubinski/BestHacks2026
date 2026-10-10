import { Injectable } from "@nestjs/common";
import { TAG_GROUPS, type StyleTag } from "../../places/style-tag";
import { TAG_LABELS } from "../tag-labels";

export type TagGroup = keyof typeof TAG_GROUPS;

export type TagView = { id: StyleTag; group: TagGroup; label: string };

@Injectable()
export class TagQueryService {
  list(): TagView[] {
    return (Object.keys(TAG_GROUPS) as TagGroup[]).flatMap((group) =>
      TAG_GROUPS[group].map((id) => ({ id, group, label: TAG_LABELS[id] })),
    );
  }
}
