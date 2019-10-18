import { Component, EventEmitter, Input, OnDestroy, OnInit } from '@angular/core';
import { MapService } from './map.service';
import { SidebarService } from '../core/sidebar/sidebar.service';
import { ResizedEvent } from 'angular-resize-event';
import along from '@turf/along';
import { AuthService } from '../auth/auth.service';
import * as Constants from './constants';
import { MapLayerMouseEvent } from 'mapbox-gl';

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
  selectedPlace;
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
  places = [];
  showGeoJSON = true;
  showRaster = true;
  showPOI = true;
  bottomLayer = Constants.default.DEFAULT_BOTTOM_LAYER;
  routingStartImage = { uri: 'assets/start-point-icon.png' };
  routingContinueImage = { uri: 'assets/continue-point-icon.png' };
  routingFinishImage = { uri: 'assets/end-point-icon.png' };
  iconSize = 0.5;
  imagesIteration = 0;
  images = {};
  font = 'Klokantech Noto Sans Regular';
  routeLineStyle = {
    'line-opacity': 1,
    'line-color': '#00ee00',
    'line-width': 12
  };
  useDottedRouteLine = false;
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
  currentLevelChanger = null;
  highlightClickedPoi = true;
  highlightSelectedPoi = true;
  highlightPointsCollection = {
    type: 'FeatureCollection',
    features: []
  };
  accessibleOnly = false;
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
    this.places = this.currentUserData.places;
    this.floors = this.currentUserData.floors;
    this.features = this.currentUserData.features;
    this.filteredFeatures = [...this.features.features];
    this.amenities = this.currentUserData.amenities;
    this.level = this.config.default_floor_number ? this.config.default_floor_number : 0;
    this.accessibleOnly = this.config.accessible_only ? this.config.accessible_only : false;
    this.setFloor(this.currentUserData.defaultFloor);
    this.selectedPlace = this.currentUserData.defaultPlace;
    this.showRaster = this.config.show_floorplans ? this.config.show_floorplans : true;

    this.amenityMap = this.amenities.reduce((acc, item) => {
      if (item.icon && item.icon.match(/data:image/)) {
        acc[item.id] = item.icon;
        this.amenityBaseLinks[item.id] = { uri: item.icon };
        this.amenityLinks[item.id] = { uri: `${GEO_API_ROOT}/amenities/${item.id}.png?token=${this.currentUser.token}` };
      }
      return acc;
    }, {});

    if (this.routingStartImage === null) {
      this.routingStartImage = this.amenityBaseLinks.route_start;
    }

    if (this.routingFinishImage === null) {
      this.routingFinishImage = this.amenityBaseLinks.route_finish;
    }

    this.updateImages();

    const center =
      this.config.point_of_origin &&
      this.config.point_of_origin.lat &&
      this.config.point_of_origin.lng ?
        [this.config.point_of_origin.lng, this.config.point_of_origin.lat] :
        this.selectedPlace ? [this.selectedPlace.location.lng, this.selectedPlace.location.lat] : [0, 0];
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
      this.sidebarService.getStartPointListener().subscribe(poi => {
        this.startPoi = poi;
        const feature = poi ? this.filteredFeatures.filter(f => f.properties.id === poi.id)[0] : null;
        if (poi && !this.endPoi) {
          this.centerOnPoi(poi);
        }
        this.generateHighlightSource(feature, 'startPoi');
        this.generateRoute();
      }),
      this.sidebarService.getEndPointListener().subscribe(poi => {
        this.endPoi = poi;
        const feature = poi ? this.filteredFeatures.filter(f => f.properties.id === poi.id)[0] : null;
        if (poi && !this.startPoi) {
          this.centerOnPoi(poi);
        }
        this.generateHighlightSource(feature, 'endPoi');
        this.generateRoute();
      }),
      this.sidebarService.getAccessibleOnlyToggleListener().subscribe(accessibleOnly => {
        this.accessibleOnly = accessibleOnly;
        this.generateRoute();
      }),
      this.sidebarService.getSelectedPlaceListener().subscribe(place => {
        this.setPlace(place);
      })
    );
  }

  centerOnPoi(poi) {
    const floor = this.floors.filter(f => f.level === poi.level && f.place_id === this.selectedPlace.id)[0];
    this.mapCenter = poi.coordinates;
    this.mapZoom = [21];
    this.setFloor(floor);
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
    images[Constants.default.IMAGE_ROUTING_CONTINUE] = this.routingContinueImage;
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

  onFloorChange(way, currentLevelChanger) {
    let floor;
    let nextLevel = way === 'up' ? this.level + 1 : this.level - 1;
    if (currentLevelChanger && currentLevelChanger.way === way) {
      nextLevel = currentLevelChanger.nextLevel;
    }
    floor =
      this.floors.findIndex(f => f.level === nextLevel && f.place_id === this.selectedPlace.id) !== -1 ?
        this.floors.filter(f => f.level === nextLevel && f.place_id === this.selectedPlace.id)[0] :
        this.selectedFloor;
    this.setFloor(floor);
  }

  setPlace(place) {
    this.selectedPlace = place;
    this.mapCenter = [this.selectedPlace.location.lng, this.selectedPlace.location.lat];
    const floor = this.floors.filter(f => f.place_id === this.selectedPlace.id)[0];
    if (floor) {
      this.setFloor(floor);
    }
  }

  setFloor(floor) {
    if (floor) {
      this.level = floor.level;
      this.selectedFloor = floor;
      this.generateFloorplanSource();
      this.generateRoutingSource();
      this.updateImages();
    }
  }

  generateFloorplanSource() {
    if (this.floorplans.findIndex(f => f.source.id === `${Constants.default.SOURCE_RASTER_FLOORPLAN}-${this.selectedFloor.id}`) === -1 ) {
      this.floorplans = [];
      if (
        this.selectedFloor.level === this.level &&
        (Array.isArray(this.selectedFloor.anchors) && this.selectedFloor.anchors.length === 4) &&
        this.selectedFloor.floorplan_image_url != null && this.selectedFloor.floorplan_image_url.length > 0
      ) {
        const source = {
          id: `${Constants.default.SOURCE_RASTER_FLOORPLAN}-${this.selectedFloor.id}`,
          url: `https://api.proximi.fi/imageproxy?source=${this.selectedFloor.floorplan_image_url}`,
          coordinates: this.selectedFloor.editor ?
            this.selectedFloor.editor.coordinates :
            [
              [this.selectedFloor.anchors[0].lng, this.selectedFloor.anchors[0].lat],
              [this.selectedFloor.anchors[1].lng, this.selectedFloor.anchors[1].lat],
              [this.selectedFloor.anchors[3].lng, this.selectedFloor.anchors[3].lat],
              [this.selectedFloor.anchors[2].lng, this.selectedFloor.anchors[2].lat]
            ]
        };
        const layer = {
          title: this.selectedFloor.name,
          id: `${Constants.default.LAYER_RASTER_FLOORPLAN}-${this.selectedFloor.id}`,
          layout: {
            'visibility': this.showRaster ? 'visible' : 'none'
          },
          paint: {
            'raster-opacity': 1
          }
        };
        this.floorplans.push({source: source, layer: layer});
      }
    }
  }

  generateRoute() {
    if (this.startPoi && this.endPoi) {
      this.mapService.getRoute(this.startPoi, this.endPoi, this.accessibleOnly, false, this.currentUser.token)
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
    this.currentLevelChanger = null;
    let path = null;

    if (!this.route) {
      this.ignoreRoute = true;
    } else if (this.route.levelPaths) {
      const levelChanges = this.route.steps.filter(step => step.levelChange)
        .map(step => {
          const s = {
            currentLevel: step.point[2],
            nextLevel: step.nextPoint[2],
            way: step.point[2] > step.nextPoint[2] ? 'down' : 'up'
          };
          return s;
        });
      this.currentLevelChanger = levelChanges.filter(change => change.currentLevel === this.level)[0];
      path = this.singleLevel ? this.route.linestring.path : this.route.levelPaths[this.level];
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
              icon: this.currentLevelChanger ? Constants.default.IMAGE_ROUTING_CONTINUE : Constants.default.IMAGE_ROUTING_FINISH
            }
          }
        ]
      };

      if (this.currentLevelChanger) {
        this.routeCollection.features.push({
          type: 'Feature',
          id: this.currentLevelChanger.way === 'up' ? Constants.default.FEATURE_FLOORCHANGE_UP : Constants.default.FEATURE_FLOORCHANGE_DOWN,
          geometry: {
            type: 'Point',
            coordinates: path.geometry.coordinates[path.geometry.coordinates.length - 1]
          },
          properties: {
            usecase: 'floor-change-symbol',
            icon: this.currentLevelChanger.way === 'up' ? Constants.default.IMAGE_FLOORCHANGE_UP : Constants.default.IMAGE_FLOORCHANGE_DOWN
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

  onPoiClick(evt: MapLayerMouseEvent) {
    const feature = this.filteredFeatures.filter(f => f.properties.id === evt.features[0].properties.id)[0];
    if (feature) {
      this.generateHighlightSource(feature, 'click');
    }
  }

  generateHighlightSource(feature, type) {
    if (feature) {
      const newHighlight: any = {
        type: 'Feature',
        id: `Constants.default.FEATURE_HIGHLIGHT_POINT-${feature.id}`,
        geometry: {
          type: 'Point',
          coordinates: feature.geometry.coordinates
        },
        properties: {
          level: feature.properties.level
        }
      };
      let previousClickHighlight = null;

      if (type === 'click') {
        newHighlight.properties.usecase = 'clicked-point-highlight';
        previousClickHighlight = this.highlightPointsCollection.features.filter(f => f.id === newHighlight.id && f.properties.usecase === 'clicked-point-highlight')[0];
      } else if (type === 'startPoi') {
        newHighlight.properties.usecase = 'startpoi-point-highlight';
      } else if (type === 'endPoi') {
        newHighlight.properties.usecase = 'endpoi-point-highlight';
      }

      if (this.highlightPointsCollection.features.length > 0) {
        // remove previous highlight instance with same usecase if exists
        this.highlightPointsCollection.features = this.highlightPointsCollection.features.filter(f => f.properties.usecase !== newHighlight.properties.usecase);
      }

      // only add new feature if the previous one was not the clicked usecase and it's not the same otherwise keep it removed
      if (!previousClickHighlight) {
        this.highlightPointsCollection.features.push(newHighlight);
      }
    } else {
      // remove highlight after poi unselect
      if (type === 'startPoi') {
        this.highlightPointsCollection.features = this.highlightPointsCollection.features.filter(f => f.properties.usecase !== 'startpoi-point-highlight');
      } else if (type === 'endPoi') {
        this.highlightPointsCollection.features = this.highlightPointsCollection.features.filter(f => f.properties.usecase !== 'endpoi-point-highlight');
      }
    }

    this.highlightPointsCollection = {...this.highlightPointsCollection};
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

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

}
