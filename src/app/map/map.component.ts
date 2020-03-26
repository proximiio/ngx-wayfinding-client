import { Component, EventEmitter, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { MapService } from './map.service';
import { SidebarService } from '../core/sidebar/sidebar.service';
import { ResizedEvent } from 'angular-resize-event';
import along from '@turf/along';
import { AuthService } from '../auth/auth.service';
import * as Constants from './constants';
import { MapboxGeoJSONFeature, MapLayerMouseEvent } from 'mapbox-gl';
import { PoiDetailsDialogComponent } from './poi-details-dialog/poi-details-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import * as moment from 'moment';

const GEO_API_ROOT = 'https://api.proximi.fi/v5/geo';

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
  mapLoaded = new EventEmitter<boolean>();
  isLoaded = false;
  currentUser;
  config;
  currentUserData;
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
  floors = [];
  places = [];
  showRaster = true;
  routingStartImage = { uri: 'assets/start-point-icon.png' };
  routingContinueImage = { uri: 'assets/continue-point-icon.png' };
  routingFinishImage = { uri: 'assets/end-point-icon.png' };
  useCustomRoutingImages = false;
  imagesIteration = 0;
  images = {};
  font = 'Klokantech Noto Sans Regular';
  objectKeys = Object.keys;
  accessibleOnly = false;
  @Input() mapMovingMethod: string;
  private subs = [];

  constructor(
    private mapService: MapService,
    private authService: AuthService,
    public sidebarService: SidebarService,
    private dialog: MatDialog,
    private zone: NgZone
  ) {
    this.currentUser = this.authService.getCurrentUser();
    this.config = this.authService.getCurrentUserConfig();
    this.currentUserData = this.authService.getCurrentUserData();
    this.places = this.currentUserData.places;
    this.floors = this.currentUserData.floors;
    this.features = this.currentUserData.features;
    this.filteredFeatures = {...this.features};
    this.amenities = this.currentUserData.amenities;
    this.level = this.config.default_floor_number ? this.config.default_floor_number : 0;
    this.accessibleOnly = this.config.accessible_only ? this.config.accessible_only : false;
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
      this.sidebarService.getSelectedPlaceListener().subscribe(place => {
        this.setPlace(place);
      }),
      this.sidebarService.getLegendToggleListener().subscribe(legend => {
        this.togglePoiVisibility(legend);
      }),
      this.sidebarService.getOnlyOpenedListener().subscribe(val => {
        this.onlyOpenedPois(val);
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
      `${GEO_API_ROOT}/style?token=${this.currentUser.token}&basic=true&skipfile=true` :
      `${GEO_API_ROOT}/style?token=${this.currentUser.token}&basic=true`;
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

    images['bluedot'] = { uri: this.mapService.bluedot };
    images[Constants.default.IMAGE_FLOORCHANGE_UP] = { uri: 'assets/go-up-alt.png' };
    images[Constants.default.IMAGE_FLOORCHANGE_DOWN] = { uri: 'assets/go-down-alt.png' };
    images[Constants.default.IMAGE_ROUTING_START] = this.routingStartImage;
    images[Constants.default.IMAGE_ROUTING_CONTINUE] = this.useCustomRoutingImages ? this.routingContinueImage : this.routingFinishImage;
    images[Constants.default.IMAGE_ROUTING_FINISH] = this.routingFinishImage;

    this.images = images;
    this.imagesIteration++;
  }

  setPlace(place) {
    this.selectedPlace = place;
    this.mapCenter = [this.selectedPlace.location.lng, this.selectedPlace.location.lat];
  }

  onLoad(map) {
    this.map = map;
    this.addLayerFilters();
    this.refreshLayers();
    this.mapLoaded.emit(true);
    this.map.resize();
    this.isLoaded = true;

    map.on('click', 'pois-icons', (e: MapLayerMouseEvent) => {
      const poi = e.features[0];
      this.zone.run(() => {
        this.dialog.open(PoiDetailsDialogComponent, {
          width: '420px',
          data: poi,
          panelClass: 'dialog-transparent'
        });
      });
    });

    // Change the cursor to a pointer when the mouse is over the pois layer.
    map.on('mouseenter', 'pois-icons', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    // Change it back to a pointer when it leaves.
    map.on('mouseleave', 'pois-icons', () => {
      map.getCanvas().style.cursor = '';
    });
  }

  refreshLayers() {
    if (this.map) {
      const clusterFeatures = {...this.filteredFeatures};
      clusterFeatures['features'] = clusterFeatures['features'].filter(f => f.properties.visibility === 'visible');
      this.map.getSource('main').setData(this.filteredFeatures);
      this.map.getSource('clusters').setData(clusterFeatures);
    }
  }

  addLayerFilters() {
    const poiLayers = ['pois-icons', 'pois-labels'];
    if (this.map) {
      poiLayers.forEach(l => {
        const layer = this.map.getLayer(l);
        if (layer && layer.filter && Array.isArray(layer.filter)) {
          const filterArray = [...layer.filter];
          filterArray.push(['!=', ['get', 'visibility'], 'none']);
          this.map.setFilter(l, filterArray);
        }
      });
    }
  }

  togglePoiVisibility(legend) {
    if (!legend.active) {
      this.filteredFeatures['features'] = this.filteredFeatures['features'].filter(i => i.properties.category_id !== legend.category_id);
      this.refreshLayers();
    } else {
      const amenityFeatures = [...this.features['features'].filter(i => i.properties.category_id === legend.category_id)];
      this.filteredFeatures['features'] = this.filteredFeatures['features'].concat(amenityFeatures);
      this.refreshLayers();
    }
    /*if (this.map) {
      const layers = this.map.getStyle().layers;
      layers.forEach(l => {
        const layer = this.map.getLayer(l.id);
        if (layer && layer.filter && Array.isArray(layer.filter)) {
          const filterArray = [...layer.filter];
          if (legend.active) {
            // filterArray.push(['==', ['get', 'amenity'], legend.amenity_id]);
            console.log('pois visible');
          } else {
            filterArray.push(['==', 'amenity', legend.amenity_id]);
            console.log('pois hidden');
          }
          this.map.setFilter(l.id, filterArray);
        }
      });
    }*/
  }

  onlyOpenedPois(showOnlyOpened) {
    if (showOnlyOpened) {
      this.filteredFeatures['features'] = this.filteredFeatures['features'].map(f => {
        const metadata = f.properties.metadata;
        f.properties.visibility =
          metadata && metadata.openHours && metadata.openHours.mon && this.isOpen(metadata.openHours) ?
            'visible' :
            'none';
        return f;
      });
    } else {
      this.filteredFeatures['features'] = this.filteredFeatures['features'].map(f => {
        f.properties.visibility = 'visible';
        return f;
      });
    }
    this.refreshLayers();
  }

  private centerizeMap(location, zoom) {
    this.mapCenter = [location.lng, location.lat];
    if (this.mapZoom[0] === 0 && zoom) {
      this.mapZoom = [zoom];
    }
  }

  private isOpen(openHours) {
    const currentDay = moment().format('ddd').toLowerCase();
    const currentOpenHours = openHours[currentDay];
    if (currentOpenHours.open === 'Suljettu') {
      return false;
    } else {
      const open = moment()
        .hour(currentOpenHours.open.split('.')[0])
        .minute(currentOpenHours.open.split('.')[1])
        .second(0);
      const close = moment()
        .hour(currentOpenHours.close.split('.')[0])
        .minute(currentOpenHours.close.split('.')[1])
        .second(0);
      return moment().isBetween(open, close);
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

}
