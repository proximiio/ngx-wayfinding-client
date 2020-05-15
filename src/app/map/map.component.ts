import { Component, EventEmitter, Input, OnDestroy, OnInit } from '@angular/core';
import { MapService } from './map.service';
import { SidebarService } from '../core/sidebar/sidebar.service';
import { ResizedEvent } from 'angular-resize-event';
import { AuthService } from '../auth/auth.service';
import Amenity from './models/amenity.model';
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

declare var mapa: any;

interface State {
  readonly initializing: boolean;
  readonly amenities: Amenity[];
  readonly floor: Floor;
  readonly floors: Floor[];
  readonly place: Place;
  readonly places: Place[];
  readonly style: Style;
  readonly styles: Style[];
  readonly selected: Feature[];
  readonly selectorFeatures: Feature[];
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
  originalStyle: any;
  geojsonSource: GeoJSONSource = new GeoJSONSource(new FeatureCollection({}));
  syntheticSource: SyntheticSource = new SyntheticSource(new FeatureCollection({}));
  routingSource: RoutingSource = new RoutingSource();
  clusterSource: ClusterSource = new ClusterSource();
  imageSourceManager: ImageSourceManager = new ImageSourceManager(this.authService);

  @Input() mapMovingMethod: string;
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
      amenities: [],
      initializing: true,
      floor: new Floor({}),
      floors: [],
      place: new Place({}),
      places: [],
      style: new Style({}),
      styles: [],
      selected: [],
      selectorFeatures: [],
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
    // this.onMapSelection = this.onMapSelection.bind(this);
    // this.onBoxSelection = this.onBoxSelection.bind(this);
    // this.onCenterChange = this.onCenterChange.bind(this);
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
        // this.generateRoute();
      }),
      this.sidebarService.getEndPointListener().subscribe(poi => {
        this.endPoi = poi;
        if (poi && !this.startPoi) {
          this.centerOnPoi(poi);
        }
        // this.generateRoute();
      }),
      // this.sidebarService.getAccessibleOnlyToggleListener().subscribe(accessibleOnly => {
       // this.accessibleOnly = accessibleOnly;
       // this.generateRoute();
      // }),
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
    this.geojsonSource.fetch(this.features);
    this.onSourceChange();
    this.prepareStyle(style);
    const place = places.length > 0 ? places[0] : new Place({});
    this.imageSourceManager.belowLayer = style.usesPrefixes() ? 'proximiio-floors' : 'floors';
    this.imageSourceManager.initialize();
    this.state = {
      ...this.state,
      amenities: this.amenities,
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
    await this.onPlaceSelect(this.state.place);
    console.log(this.state);
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
      selected: this.state.selected.map(feature => this.geojsonSource.get(feature.id) || this.geojsonSource.getInternal(feature.properties.id)),
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
    console.log('onStyleChange', event, data);

    const map = this.map;
    if (map) {
      if (event === 'polygon-editing-toggled') {
        if (this.state.style.polygonEditing) {
          if (!this.state.style.segments) {
            this.state.style.toggleSegments();
          }
          if (!this.state.style.routable) {
            this.state.style.toggleRoutable();
          }
        } else {
          if (this.state.style.overlay) {
            this.state.style.toggleOverlay();
          }
          if (this.state.style.segments) {
            this.state.style.toggleSegments();
          }
          if (this.state.style.routable) {
            this.state.style.toggleRoutable();
          }
        }
      }

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
    // this.map.setStyle(this.state.style);
    console.log('new style set', this.state.style);
    this.state = {...this.state, style: this.state.style};
  }

  onRasterToggle(value: boolean) {
    this.imageSourceManager.enabled = value;
    const map = this.map;
    if (map) {
      this.imageSourceManager.setLevel(map, this.state.floor.level);
    }
  }

  onMapReady() {
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
      // const decodedChevron = await getImageFromBase64(chevron)
      // map.addImage('chevron_right', decodedChevron as any)
      this.updateMapSource(this.geojsonSource);
      this.updateMapSource(this.routingSource);
      this.updateCluster();
      // map.setStyle(this.state.style);
      this.imageSourceManager.setLevel(map, this.state.floor.level);
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

  onFloorSelect(floor: Floor) {
    const map = this.map;
    if (map) {
      this.state.style.setLevel(floor.level);
      [...this.state.style.getLayers('main'), ...this.state.style.getLayers('route')].forEach(layer => map.setFilter(layer.id, layer.filter));
      map.setStyle(this.state.style);
      this.imageSourceManager.setLevel(map, floor.level);
    }
    this.state = {...this.state, floor, style: this.state.style};
    this.updateCluster();
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
    const floor = this.state.floors.find(f => f.level === poi.level);
    // this.mapCenter = poi.coordinates;
    // this.mapZoom = [21];
    this.onFloorSelect(new Floor(floor));
    // this.setFloor(floor);
  }

  onResized(event: ResizedEvent) {
    if (this.map) {
      this.map.resize();
    }
  }

  onFloorChange(way) {
    let floor;
    const nextLevel = way === 'up' ? this.state.floor.level + 1 : this.state.floor.level - 1;
    floor = this.state.floors.filter(f => f.level === nextLevel) ? this.state.floors.filter(f => f.level === nextLevel)[0] : this.state.floor;
    this.onFloorSelect(new Floor(floor));
  }

  setPlace(place) {
    this.onPlaceSelect(new Place(place));
  }

  onLoad(map) {
    mapa = map;
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
