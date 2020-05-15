import BaseModel from './base.model';

export type Coordinates = [number, number];

export default class Floor extends BaseModel {
  name: string;
  // tslint:disable-next-line:variable-name
  place_id: string;
  level: number;
  // tslint:disable-next-line:variable-name
  floorplan_image_url: string;
  anchors?: [Coordinates, Coordinates, Coordinates, Coordinates];

  constructor(data: any) {
    super(data);
    this.name = data.name;
    this.place_id = data.place_id;
    this.level = data.level || 0;
    this.floorplan_image_url = data.floorplan_image_url;
    if (data.anchors) {
      this.anchors = [
        [data.anchors[0].lng, data.anchors[0].lat],
        [data.anchors[1].lng, data.anchors[1].lat],
        [data.anchors[3].lng, data.anchors[3].lat],
        [data.anchors[2].lng, data.anchors[2].lat]
      ];
    }
  }

  get hasFloorplan() {
    return this.floorplan_image_url && this.floorplan_image_url.length > 1 && this.anchors;
  }
}
