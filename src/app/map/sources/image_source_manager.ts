import Observable from '../observable';
import Repository from '../repository';
import Floor from '../models/floor.model';
import { ImageSourceRaw, RasterLayout } from 'mapbox-gl';

export default class ImageSourceManager extends Observable {
  sources: string[] = [];
  layers: string[] = [];
  floors: Floor[] = [];
  belowLayer = 'proximiio-floors';
  enabled = true;

  constructor() {
    super();
  }

  async initialize() {
    this.floors = await Repository.getFloors();
  }

  setLevel(map: mapboxgl.Map, level: number) {
    this.layers.forEach(id => {
      try {
        if (map.getLayer(id)) {
          map.removeLayer(id);
        }
      } catch (e) {
        console.log('unable to remove layer', id);
      }
    });
    this.sources.forEach(id => {
      try {
        if (map.getSource(id)) {
          map.removeSource(id);
        }
      } catch (e) {
        console.log('unable to remove source', id);
      }
    });

    if (this.enabled) {
      const floors = this.floors.filter(floor => floor.hasFloorplan && floor.level === level);
      floors.forEach(floor => {
        const source = {
          type: 'image',
          url: floor.floorplan_image_url,
          // tslint:disable-next-line:no-non-null-assertion
          coordinates: floor.anchors!
        } as ImageSourceRaw;

        const sourceId = `image-source-${floor.id}`;
        map.addSource(sourceId, source);
        this.sources.push(sourceId);

        const layer = {
          id: `image-layer-${floor.id}`,
          type: 'raster' as 'raster',
          source: sourceId,
          layout: {
            visibility: 'visible'
          } as RasterLayout
        };

        map.addLayer(layer, this.belowLayer);
        this.layers.push(layer.id);
      });
    }
  }
}
