import { Component, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { MapService } from './map.service';
import { SidebarService } from '../core/sidebar/sidebar.service';
import { ResizedEvent } from 'angular-resize-event';
import { AuthService } from '../auth/auth.service';
import Floor from './models/floor.model';
import Place from './models/place.model';
import Style from './models/style.model';
import Feature, { FeatureCollection } from './models/feature.model';
import RoutingSource from './sources/routing_source';
import GeoJSONSource from './sources/geojson_source';
import SyntheticSource from './sources/synthetic_source';
import ClusterSource from './sources/cluster_source';
import ImageSourceManager from './sources/image_source_manager';
import Repository from './repository';
import DataSource from './sources/data_source';
import { getImageFromBase64 } from './common';
import { chevron } from './icons';
import * as turf from '@turf/turf';

interface State {
  readonly initializing: boolean;
  readonly floor: Floor;
  readonly floors: Floor[];
  readonly place: Place;
  readonly places: Place[];
  readonly style: Style;
  readonly styles: Style[];
  readonly latitude: number;
  readonly longitude: number;
  readonly loadingRoute: boolean;
  readonly options: any;
  readonly noPlaces: boolean;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, OnDestroy {
  map: any;
  mapLoaded = new EventEmitter<boolean>();
  currentUser;
  currentUserData;
  amenities = [];
  amenityBaseLinks: any = {};
  features: any = {};
  showRaster = true;
  imagesIteration = 0;
  images = {};
  objectKeys = Object.keys;
  startPoi;
  endPoi;
  accessibleOnly = false;
  state: State;
  geojsonSource: GeoJSONSource = new GeoJSONSource(new FeatureCollection({}));
  syntheticSource: SyntheticSource = new SyntheticSource(new FeatureCollection({}));
  routingSource: RoutingSource = new RoutingSource();
  clusterSource: ClusterSource = new ClusterSource();
  imageSourceManager: ImageSourceManager = new ImageSourceManager();

  private subs = [];

  constructor(
    private mapService: MapService,
    private authService: AuthService,
    public sidebarService: SidebarService
  ) {
    this.currentUser = this.authService.getCurrentUser();
    this.currentUserData = this.authService.getCurrentUserData();
    this.features = this.currentUserData.features;
    this.amenities = this.currentUserData.amenities;

    this.state = {
      initializing: true,
      floor: new Floor({}),
      floors: [],
      place: new Place({}),
      places: [],
      style: new Style({}),
      styles: [],
      latitude: 60.1669635,
      longitude: 24.9217484,
      loadingRoute: false,
      noPlaces: false,
      options: {
        coordinates: [0, 0],
        zoom: 0,
        pitch: 0,
        bearing: 0,
        bounds: [[0, 0], [0, 0]]
      }
    };

    this.onPlaceSelect = this.onPlaceSelect.bind(this);
    this.onFloorSelect = this.onFloorSelect.bind(this);
    this.onMapReady = this.onMapReady.bind(this);
    this.onSourceChange = this.onSourceChange.bind(this);
    this.onSyntheticChange = this.onSyntheticChange.bind(this);
    this.onStyleChange = this.onStyleChange.bind(this);
    this.onStyleSelect = this.onStyleSelect.bind(this);
    this.onRouteUpdate = this.onRouteUpdate.bind(this);
    this.onRouteChange = this.onRouteChange.bind(this);
    this.onRouteCancel = this.onRouteCancel.bind(this);
    this.onOptionsChange = this.onOptionsChange.bind(this);

    this.updateImages();
  }

  ngOnInit() {
    this.initialize();
    this.subs.push(
      this.sidebarService.getStartPointListener().subscribe(poi => {
        this.startPoi = poi;
        if (poi && !this.endPoi) {
          this.centerOnPoi(poi);
        }
        this.generateRoute();
      }),
      this.sidebarService.getEndPointListener().subscribe(poi => {
        this.endPoi = poi;
        if (poi && !this.startPoi) {
          this.centerOnPoi(poi);
        }
        this.generateRoute();
      }),
      this.sidebarService.getAccessibleOnlyToggleListener().subscribe(accessibleOnly => {
       this.accessibleOnly = accessibleOnly;
       this.routingSource.toggleAccessible(accessibleOnly);
       this.generateRoute();
      }),
      this.sidebarService.getSelectedPlaceListener().subscribe(place => {
        this.setPlace(place);
      })
    );
  }

  async initialize() {
    this.geojsonSource.observe(this.onSourceChange);
    this.syntheticSource.observe(this.onSyntheticChange);
    this.routingSource.observe(this.onRouteChange);
    await this.fetch();
  }

  async cancelObservers() {
    this.geojsonSource.cancel(this.onSourceChange);
    this.syntheticSource.cancel(this.onSyntheticChange);
    this.state.style.cancel(this.onStyleChange);
  }

  async fetch() {
    const { places, style, styles } = await Repository.getPackage();
    const place = places.length > 0 ? places[0] : new Place({});
    style.center = [place.lng, place.lat];
    this.geojsonSource.fetch(this.features);
    this.routingSource.routing.setData(new FeatureCollection(this.features));
    this.onSourceChange();
    this.prepareStyle(style);
    this.imageSourceManager.belowLayer = style.usesPrefixes() ? 'proximiio-floors' : 'floors';
    this.imageSourceManager.initialize();
    this.state = {
      ...this.state,
      initializing: false,
      place,
      places,
      style,
      styles,
      latitude: place.lat,
      longitude: place.lng,
      noPlaces: places.length === 0
    };
    style.observe(this.onStyleChange);
  }

  prepareStyle(style: Style) {
    style.setSource('main', this.geojsonSource);
    style.setSource('synthetic', this.syntheticSource);
    style.setSource('route', this.routingSource);
    style.setSource('clusters', this.clusterSource);
    style.setLevel(0);
  }

  onRouteChange(event?: string) {
    if (event === 'loading-start') {
      this.state = {...this.state, loadingRoute: true};
      return;
    }

    if (event === 'loading-finished') {
      const routeStart = this.routingSource.route[this.routingSource.start.properties.level];
      this.centerOnRoute(routeStart);
      this.state = {...this.state, loadingRoute: false};
      return;
    }

    if (event === 'route-undefined') {
      console.log('route not found');
      this.state = {...this.state, loadingRoute: false};
      return;
    }

    const style = this.state.style;
    style.setSource('route', this.routingSource);
    this.state = {...this.state, style};

    this.updateMapSource(this.routingSource);
  }

  onSourceChange() {
    this.state = {
      ...this.state,
      style: this.state.style
    };
    this.updateMapSource(this.geojsonSource);
    // this.routingSource.routing.setData(this.geojsonSource.collection)
    this.updateCluster();
  }

  onSyntheticChange() {
    this.state.style.setSource('synthetic', this.syntheticSource);
    this.updateMapSource(this.syntheticSource);
  }

  updateMapSource(source: DataSource) {
    const map = this.map;
    if (map) {
      const mapSource = map.getSource(source.id) as any;
      if (mapSource) {
        mapSource.setData(source.data);
      }
    }
  }

  onStyleSelect(style: Style) {
    const map = this.map;
    if (map) {
      this.prepareStyle(style);
      map.setStyle(style.json);
    }

    this.state = {...this.state, style};
  }

  onStyleChange(event?: string, data?: any) {
    const map = this.map;
    if (map) {
      if (event === 'overlay-toggled') {
        const overlay = this.state.style.overlay ? 'visible' : 'none';
        map.setLayoutProperty('main-polygon-fill', 'visibility', overlay);
        map.setLayoutProperty('main-polygon-outline', 'visibility', overlay);
      }

      if (event === 'segments-toggled') {
        const segments = this.state.style.segments ? 'visible' : 'none';
        map.setLayoutProperty('main-segment-fill', 'visibility', segments);
        map.setLayoutProperty('main-segment-outline', 'visibility', segments);
      }

      if (event === 'routable-toggled') {
        const routables = this.state.style.segments ? 'visible' : 'none';
        map.setLayoutProperty('main-routable-fill', 'visibility', routables);
        map.setLayoutProperty('main-routable-outline', 'visibility', routables);
      }

      if (event === 'cluster-toggled') {
        const clusters = this.state.style.cluster ? 'visible' : 'none';
        map.setLayoutProperty('clusters-circle', 'visibility', clusters);
      }
    }

    if (event === 'layer-update' && data) {
      const { layer, changes }: any = data;
      const layoutChanges = (changes as any[]).filter(diff => diff.kind === 'E' && diff.path[0] === 'layout');
      const paintChanges = (changes as any[]).filter(diff => diff.kind === 'E' && diff.path[0] === 'paint');
      // tslint:disable-next-line:no-shadowed-variable
      const map = this.map;
      if (map) {
        layoutChanges.forEach(change => {
          if (change.kind === 'E') {
            map.setLayoutProperty(layer.id, change.path[1], change.rhs);
          }
        });
        paintChanges.forEach(change => {
          if (change.kind === 'E') {
            map.setPaintProperty(layer.id, change.path[1], change.rhs);
          }
        });
      }
    }

    if (event === 'filter-change') {
      // tslint:disable-next-line:no-shadowed-variable
      const map = this.map;
      this.state.style.getLayers('main').forEach(layer => {
        if (map.getLayer(layer.id)) {
          map.removeLayer(layer.id);
        }
        map.addLayer(layer);
      });
    }
    // this.map.setStyle(this.state.style);
    this.state = {...this.state, style: this.state.style};
  }

  onRasterToggle(value: boolean) {
    this.imageSourceManager.enabled = value;
    const map = this.map;
    if (map) {
      this.imageSourceManager.setLevel(map, this.state.floor.level);
    }
  }

  onLoad(map) {
    this.map = map;
    this.onMapReady();
    this.mapLoaded.emit(true);
    this.map.resize();
    this.subs.push(
      this.sidebarService.getSidebarStatusListener().subscribe(() => {
        if (this.map) {
          setTimeout(() => {
            this.map.resize();
          }, 500);
        }
      })
    );
  }

  async onMapReady() {
    // set paths visible if available
    const map = this.map;
    if (map) {
      this.state.style.togglePaths(true);
      // routing layers
      const routingLayer = map.getLayer('routing-line-completed');
      const usePrefixed = typeof routingLayer === 'undefined' && typeof map.getLayer('proximiio-routing-line-completed') !== 'undefined';
      const shopsLayer = map.getLayer('shops');

      if (usePrefixed) {
        map.moveLayer('proximiio-routing-line-completed', 'proximiio-outer_wall');
        map.moveLayer('proximiio-routing-line-remaining', 'proximiio-outer_wall');
        map.moveLayer('proximiio-paths', 'routing-line-completed');
      } else {
        if (routingLayer) {
          if (shopsLayer) {
            map.moveLayer('routing-line-completed', 'proximiio-routing-symbols');
            map.moveLayer('routing-line-remaining', 'proximiio-routing-symbols');
          }
          map.moveLayer('proximiio-paths', 'routing-line-completed');
        }
      }
      map.setMaxZoom(30);
      const decodedChevron = await getImageFromBase64(chevron);
      map.addImage('chevron_right', decodedChevron as any);
      this.updateMapSource(this.geojsonSource);
      this.updateMapSource(this.routingSource);
      this.updateCluster();
      // map.setStyle(this.state.style);
      this.imageSourceManager.setLevel(map, this.state.floor.level);
      await this.onPlaceSelect(this.state.place);
    }
  }

  updateCluster() {
    const map = this.map;
    if (map) {
      const data = {
        type: 'FeatureCollection',
        features: this.geojsonSource.data.features
                    .filter(f => f.isPoint && f.hasLevel(this.state.floor.level))
                    .map(f => f.json)
      } as FeatureCollection;
      const source = map.getSource('clusters') as any;
      if (source) {
        source.setData(data);
      }
    }
  }

  setPlace(place) {
    this.onPlaceSelect(new Place(place));
  }

  async onPlaceSelect(place: Place) {
    this.state = {...this.state, place};
    const floors = await Repository.getFloors(0, place.id);
    const state: any = { floors: floors.sort((a, b) => a.level - b.level) };

    if (floors.length > 0) {
      const groundFloor = floors.find(floor => floor.level === 0);
      if (groundFloor) {
        state.floor = groundFloor;
      } else {
        state.floor = floors[0];
      }
    }

    this.state = {...this.state, ...state};

    const map = this.map;
    if (map) {
      map.flyTo({ center: [ place.lng, place.lat ] });
    }
  }

  onFloorChange(way) {
    let floor;
    let nextLevel = way === 'up' ? this.state.floor.level + 1 : this.state.floor.level - 1;
    if (this.routingSource.route) {
      nextLevel = this.getUpcomingFloorNumber(way);
    }
    floor = this.state.floors.filter(f => f.level === nextLevel) ? this.state.floors.filter(f => f.level === nextLevel)[0] : this.state.floor;
    if (floor) {
      this.onFloorSelect(new Floor(floor));
    }
  }

  onFloorSelect(floor: Floor) {
    const map = this.map;
    const route = this.routingSource.route && this.routingSource.route[floor.level] ? this.routingSource.route[floor.level] : null;
    if (map) {
      this.state.style.setLevel(floor.level);
      map.setStyle(this.state.style);
      setTimeout(() => {
        [...this.state.style.getLayers('main'), ...this.state.style.getLayers('route')].forEach(layer => {
          if (map.getLayer(layer.id)) {
            map.setFilter(layer.id, layer.filter);
          }
        });
        this.imageSourceManager.setLevel(map, floor.level);
      });
      if (route) {
        const bbox = turf.bbox(route.geometry);
        map.fitBounds(bbox, { padding: 50 });
      }
    }
    this.state = {...this.state, floor, style: this.state.style};
    this.updateCluster();
  }

  generateRoute() {
    if (this.startPoi && this.endPoi) {
      this.onRouteUpdate(this.startPoi, this.endPoi);
    } else if (!this.startPoi || !this.endPoi) {
      this.onRouteCancel();
    }
  }

  onRouteUpdate(start?: Feature, finish?: Feature) {
    try {
      this.routingSource.update(start, finish);
    } catch (e) {
      console.log('catched', e);
    }
    this.state = {...this.state, style: this.state.style};
  }

  onRouteCancel() {
    this.routingSource.cancel();
  }

  onOptionsChange(options: any) {
    this.state = {...this.state, options};
  }

  centerOnPoi(poi) {
    if (this.state.floor.level !== parseInt(poi.properties.level, 0)) {
      const floor = this.state.floors.find(f => f.level === poi.properties.level);
      this.onFloorSelect(floor);
    }
    if (this.map) {
      this.map.flyTo({ center: poi.coordinates });
    }
  }

  centerOnRoute(route: Feature) {
    if (route && route.properties) {
      if (this.state.floor.level !== parseInt(route.properties.level, 0)) {
        const floor = this.state.floors.find(f => f.level === parseInt(route.properties.level, 0));
        this.onFloorSelect(floor);
      }
      if (this.map) {
        const bbox = turf.bbox(route.geometry);
        this.map.fitBounds(bbox, { padding: 50 });
      }
    }
  }

  getUpcomingFloorNumber(way: string) {
    if (this.routingSource.route) {
      const currentRouteIndex = this.routingSource.lines.findIndex(route => +route.properties.level === this.state.floor.level);
      const currentRoute = this.routingSource.lines[currentRouteIndex];
      const nextRouteIndex = way === 'up' ? currentRouteIndex + 1 : currentRouteIndex - 1;
      const nextRoute = this.routingSource.lines[nextRouteIndex];
      // return currentRouteIndex !== -1 && nextRoute ? +nextRoute.properties.level : way === 'up' ? this.state.floor.level + 1 : this.state.floor.level - 1;
      return nextRoute ? +nextRoute.properties.level : this.state.floor.level;
    }
  }

  onResized(event: ResizedEvent) {
    if (this.map) {
      this.map.resize();
    }
  }

  updateImages() {
    const amenityIds = new Set(
      this.features.features.filter(f => f.properties && f.properties.usecase === 'poi' && f.properties.amenity)
        .map(f => f.properties.amenity)
    );

    const images = {};

    amenityIds.forEach((id: string) => {
      images[id] = this.amenityBaseLinks[id];
    });

    this.amenities
      .filter(a => a.icon)
      .forEach(amenity => {
        images[amenity.id] = { uri: amenity.icon };
      });

    this.images = images;
    this.imagesIteration++;
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.cancelObservers();
  }

}
