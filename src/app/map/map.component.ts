import { Component, EventEmitter, Input, OnDestroy, OnInit } from '@angular/core';
import { MapService } from './map.service';
import { SidebarService } from '../core/sidebar/sidebar.service';
import { DomSanitizer } from '@angular/platform-browser';
import { ResizedEvent } from 'angular-resize-event';
import along from '@turf/along';
import { AuthService } from '../auth/auth.service';
import * as Constants from './constants';

const GEO_API_ROOT = 'https://api.proximi.fi/v4/geo';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, OnDestroy {
  map: any;
  mapStyle = '';
  mapCenter = [0, 0];
  mapZoom = [12];
  mapBearing = 20;
  mapPitch = 40;
  floorplans: any[] = [];
  mapLoaded = new EventEmitter<boolean>();
  isLoaded = false;
  currentUser;
  config;
  currentUserData;
  selectedFloor;
  amenities = [];
  amenityMap = {};
  amenityLinks = {};
  amenityBaseLinks: any = {};
  features: any = {};
  filteredFeatures = [];
  featureCache = {};
  level: number;
  route = null;
  routeCollection = {
    type: 'FeatureCollection',
    features: []
  };
  floors = [];
  showGeoJSON = true;
  showRaster = false;
  showPOI = true;
  bottomLayer = Constants.default.DEFAULT_BOTTOM_LAYER;
  lastFloorLayer = this.bottomLayer;
  routingStartImage = null;
  routingFinishImage = null;
  iconSize = 0.5;
  imagesIteration = 0;
  images = {};
  font = 'Klokantech Noto Sans Regular';
  routeLineStyle = {
    'line-opacity': 1,
    'line-color': '#00ee00',
    'line-width': 12
  };
  useDottedRouteLine = true;
  singleLevel = false;
  showLevelChangers = true;
  Constants = Constants.default;
  objectKeys = Object.keys;
  poiTextStyle = {
    textOffset: [0, 2],
    textField: ['get', 'title'],
    textSize: 14,
    textFont: this.font,
    symbolPlacement: 'point',
    textAllowOverlap: false
  };
  startPoi;
  endPoi;
  ignoreRoute = false;
  way = null;
  @Input() mapMovingMethod: string;
  private subs = [];

  constructor(
    private mapService: MapService,
    private authService: AuthService,
    public sidebarService: SidebarService
  ) {
    this.currentUser = this.authService.getCurrentUser();
    this.config = this.authService.getCurrentUserConfig();
    this.currentUserData = this.authService.getCurrentUserData();
    this.floors = this.currentUserData.floors;
    this.features = this.currentUserData.features;
    this.filteredFeatures = [...this.features.features];
    this.amenities = this.currentUserData.amenities;
    this.level = this.config.default_floor_number ? this.config.default_floor_number : 0;
    this.setFloor(this.floors.filter(floor => floor.level === this.level)[0]);

    this.amenityMap = this.amenities.reduce((acc, item) => {
      if (item.icon && item.icon.match(/data:image/)) {
        acc[item.id] = item.icon;
        this.amenityBaseLinks[item.id] = { uri: item.icon };
        this.amenityLinks[item.id] = { uri: `${GEO_API_ROOT}/amenities/${item.id}.png?token=${this.currentUser.token}` };
      }
      return acc;
    }, {});

    this.routingStartImage = this.amenityBaseLinks.route_start;

    if (this.routingFinishImage === null) {
      this.routingFinishImage = this.amenityBaseLinks.route_finish;
    }

    this.updateImages();

    const center =
      this.config.point_of_origin &&
      this.config.point_of_origin.lat &&
      this.config.point_of_origin.lng ?
        [this.config.point_of_origin.lng, this.config.point_of_origin.lat] :
        [0, 0];
    this.mapCenter = center;
    this.mapStyle = this.styleURL;
    if (!this.mapMovingMethod) {
      this.mapMovingMethod = 'flyTo';
    }
  }

  ngOnInit() {
    this.subs.push(
      this.mapService.mapCenterListener.subscribe(res => {
        if (res && res.location) {
          this.centerizeMap(res.location, res.zoom);
        }
      }),
      this.mapService.floorplansListener.subscribe(floors => {
        this.initFloorplans(floors);
      }),
      this.sidebarService.getStartPointListener().subscribe(poi => {
        this.startPoi = poi;
        this.generateRoute();
      }),
      this.sidebarService.getEndPointListener().subscribe(poi => {
        this.endPoi = poi;
        this.generateRoute();
      })
    );
  }

  onResized(event: ResizedEvent) {
    if (this.map) {
      this.map.resize();
    }
  }

  get styleURL() {
    return this.currentUser.organization.name === 'Tawar Mall' ?
      `${GEO_API_ROOT}/style?token=${this.currentUser.token}&expr=false&basic=true&skipfile=true` :
      `${GEO_API_ROOT}/style?token=${this.currentUser.token}&expr=false&basic=true`;
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
      .filter(a => a.category === 'levelchangers')
      .forEach(amenity => {
        images[amenity.id] = { uri: amenity.icon };
      });

    images['bluedot'] = { uri: this.mapService.bluedot };
    images[Constants.default.IMAGE_FLOORCHANGE_UP] = { uri: 'assets/go-up-alt.png' };
    images[Constants.default.IMAGE_FLOORCHANGE_DOWN] = { uri: 'assets/go-down-alt.png' };
    images[Constants.default.IMAGE_ROUTING_START] = this.routingStartImage;
    images[Constants.default.IMAGE_ROUTING_FINISH] = this.routingFinishImage;

    this.images = images;
    this.imagesIteration++;
  }

  featuresForLevel(level, isPoi) {
    const cacheKey = `${level}-${isPoi ? 'poi' : 'other'}`;
    if (typeof this.featureCache[cacheKey] === 'undefined') {
      this.featureCache[cacheKey] = {
        type: 'FeatureCollection',
        features: (isPoi ? this.filteredFeatures : this.features.features).filter(f => {
          // f.properties.minzoom = 24;
          if (!f.properties) {
            return false;
          }

          if ((isPoi && f.properties.usecase !== 'poi') || (!isPoi && f.properties.usecase === 'poi')) {
            return false;
          }

          if (f.properties.usecase && f.properties.usecase === 'levelchanger') {
            return f.properties.level_min <= level && f.properties.level_max >= level;
          } else {
            return f.properties.level === level;
          }
        })
      };
    }
    return this.featureCache[cacheKey];
  }

  onFloorChange(way) {
    let floor;
    if (way === 'up') {
      floor =
        this.floors.findIndex(f => f.level === this.level + 1) !== -1 ?
        this.floors.filter(f => f.level === this.level + 1)[0] :
        this.selectedFloor;
    } else {
      floor =
        this.floors.findIndex(f => f.level === this.level - 1) !== -1 ?
        this.floors.filter(f => f.level === this.level - 1)[0] :
        this.selectedFloor;
    }
    this.setFloor(floor);
  }

  setFloor(floor) {
    this.level = floor.level;
    this.selectedFloor = floor;
    this.generateRoutingSource();
    this.updateImages();
  }

  generateRoute() {
    if (this.startPoi && this.endPoi) {
      this.mapService.getRoute(this.startPoi, this.endPoi, false, false, this.currentUser.token)
        .subscribe(route => {
          const startFloor = this.floors.filter(f => f.level === this.startPoi.level)[0];
          this.route = route;
          this.setFloor(startFloor); // this will also generate routing source
        }, error => {
          console.log(error);
        });
    } else if (!this.startPoi || !this.endPoi) {
      this.cancelRoute();
    }
  }

  generateRoutingSource() {
    this.ignoreRoute = false;
    this.way = null;
    let path = null;

    if (!this.route) {
      this.ignoreRoute = true;
    } else if (this.route.levelPaths) {
      path = this.singleLevel ? this.route.linestring.path : this.route.levelPaths[this.level];
      this.way = this.level === this.endPoi.level ? null : this.level < this.endPoi.level ? 'up' : 'down';
    }

    if (!path) {
      this.ignoreRoute = true;
    }

    if (!this.ignoreRoute) {
      path.properties.usecase = 'route-line';

      this.routeCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: Constants.default.FEATURE_ROUTING_START,
            geometry: {
              type: 'Point',
              coordinates: path.geometry.coordinates[0]
            },
            properties: {
              usecase: 'route-symbol',
              icon: Constants.default.IMAGE_ROUTING_START
            }
          },
          {
            type: 'Feature',
            id: Constants.default.FEATURE_ROUTING_FINISH,
            geometry: {
              type: 'Point',
              coordinates: path.geometry.coordinates[path.geometry.coordinates.length - 1]
            },
            properties: {
              usecase: 'route-symbol',
              icon: Constants.default.IMAGE_ROUTING_FINISH
            }
          }
        ]
      };

      if (this.way) {
        this.routeCollection.features.push({
          type: 'Feature',
          id: this.way === 'up' ? Constants.default.FEATURE_FLOORCHANGE_UP : Constants.default.FEATURE_FLOORCHANGE_DOWN,
          geometry: {
            type: 'Point',
            coordinates: path.geometry.coordinates[path.geometry.coordinates.length - 1]
          },
          properties: {
            usecase: 'floor-change-symbol',
            icon: this.way === 'up' ? Constants.default.IMAGE_FLOORCHANGE_UP : Constants.default.IMAGE_FLOORCHANGE_DOWN
          }
        });
      }

      if (!this.useDottedRouteLine) {
        this.routeCollection.features.push(path);
      }

      if (this.useDottedRouteLine) {
        const distance = this.route.distance;
        let distanceRemaining = distance;
        const separator = 1; // 1 meter
        const chunks = [];
        let i = 0;
        while (distanceRemaining > separator) {
          const point = along(path, (separator + i) / 1000);
          point.properties.usecase = 'route-line-symbol';
          chunks.push(point);
          distanceRemaining -= separator;
          i += separator;
        }
        this.routeCollection.features = [...this.routeCollection.features, ...chunks];
      }

      this.mapCenter = path.geometry.coordinates[0];
      this.mapZoom = [19];

      if (this.sidebarService.sidenavMode === 'over') {
        this.sidebarService.closeSidebar();
      }
    }
  }

  cancelRoute() {
    this.route = null;
    this.generateRoutingSource();
  }

  onLoad(map) {
    this.map = map;
    this.mapLoaded.emit(true);
    this.map.resize();
    this.isLoaded = true;
    this.mapZoom = [17];
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

  private centerizeMap(location, zoom) {
    this.mapCenter = [location.lng, location.lat];
    if (this.mapZoom[0] === 0 && zoom) {
      this.mapZoom = [zoom];
    }
  }

  private initFloorplans(floors: any[]) {
    this.floorplans = [];
    for (const floor of floors) {
      if (floor.anchors) {
        const source = {
          id: `${floor.id}-source`,
          url: floor.floorplan_image_url ?
            `https://api.proximi.fi/imageproxy?source=${floor.floorplan_image_url}` :
            'https://api.proximi.fi/imageproxy?source=https://proximi.io/platform_assets/img/no_floorplan_placeholder.png',
          coordinates: floor.editor ?
            floor.editor.coordinates :
            [
              [floor.anchors[0].lng, floor.anchors[0].lat],
              [floor.anchors[1].lng, floor.anchors[1].lat],
              [floor.anchors[3].lng, floor.anchors[3].lat],
              [floor.anchors[2].lng, floor.anchors[2].lat]
            ]
        };
        const layer = {
          title: floor.name,
          id: `${floor.id}-layer`,
          layout: {
            'visibility': 'visible'
          },
          paint: {
            'raster-opacity': 0.8
          }
        };
        this.floorplans.push({source: source, layer: layer});
      }
    }
  }

  onToggleFloorplanVisibility(floorplan, toggleAll) {
    this.floorplans = this.floorplans.map(item => {
      if (!toggleAll && item.layer.id === floorplan.layer.id) {
        item.layer.layout = {...item.layer.layout, 'visibility': floorplan.layer.layout.visibility === 'visible' ? 'none' : 'visible'};
      } else if (toggleAll) {
        item.layer.layout = {...item.layer.layout, 'visibility': toggleAll.selected ? 'visible' : 'none'};
      }
      return item;
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

}
