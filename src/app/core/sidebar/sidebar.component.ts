import { Component, OnInit } from '@angular/core';
import { isPointWithinRadius } from 'geolib';
import { AuthService } from '../../auth/auth.service';
import { SidebarService } from './sidebar.service';
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  currentUser;
  config;
  currentUserData;
  places;
  floors;
  features;
  filteredFeatures;
  amenities;
  pois;
  selectedPlace;
  showPlaceSelector = true;
  endPointLabel = 'What are you looking for?';
  startPointLabel = 'Where are you now?';
  placeSelectorLabel = 'Valitse kaupunki';
  useCustomPois = false;
  customPois = [];
  showOnlyAccessibleToggle = false;
  onlyAccessible = false;
  showPoweredBy = false;
  legendItems = [{
    icon: ['fad', 'shopping-basket'],
    amenity_image: 'assets/amenity-ruoka.png',
    amenity_id: 'bfddb33f-ba61-458b-a1ea-26f786c6ea9a:e46d943a-2110-4ed3-a547-76abbba4509b',
    category_id: 'a8fd81da-c37d-48a1-aba8-4aa0b6b5660d',
    color: '#4AD76F',
    title: 'Ruokakaupat, joissa erityisaukiolo riskiryhmille',
    active: true
  }, {
    icon: ['fad', 'burger-soda'],
    amenity_image: 'assets/lataus_3.png',
    amenity_id: 'bfddb33f-ba61-458b-a1ea-26f786c6ea9a:4f1aea09-1f5f-4084-b601-dac77ba397d1',
    category_id: '4cad57ad-f831-452d-a2dc-c5d3852d7e30',
    color: '#FF3A84',
    title: 'Ravintolat, joissa myydään noutoruokaa',
    active: true
  }, {
    icon: ['fad', 'map-marked-alt'],
    amenity_image: 'assets/amenity-muu.png',
    amenity_id: 'bfddb33f-ba61-458b-a1ea-26f786c6ea9a:69324ddd-e5f7-4c80-8e04-84bee3b41894',
    category_id: 'e3370183-cdc2-45e7-bc84-0fdff0f05028',
    color: '#3A4BB5',
    title: 'Muu kohde',
    active: true
  }];
  currentDate = new Date();
  panelOpenState = true;

  constructor(
    private authService: AuthService,
    private breakpointObserver: BreakpointObserver,
    public sidebarService: SidebarService
  ) {
    this.currentUser = this.authService.getCurrentUser();
    this.config = this.authService.getCurrentUserConfig();
    this.currentUserData = this.authService.getCurrentUserData();
    this.places = this.currentUserData.places;
    this.floors = this.currentUserData.floors;
    this.selectedPlace = this.currentUserData.defaultPlace;
    this.features = this.currentUserData.features;
    this.filteredFeatures = [...this.currentUserData.features.features];
    this.customPois = this.currentUserData.customPois ? this.currentUserData.customPois : [];
    this.amenities = this.currentUserData.amenities;
    this.onlyAccessible = this.config.accessible_only ? this.config.accessible_only : false;
    this.legendItems.map(item => {
      if (item.amenity_id && !item.amenity_image) {
        item.amenity_image = this.amenities.find(amenity => amenity.id === item.amenity_id).icon;
      }
      return item;
    });
  }

  ngOnInit() {
    this.pois = this.sortedPOIs;
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .subscribe((state: BreakpointState) => {
        if (state.breakpoints['(max-width: 599.99px)'] || state.breakpoints['(min-width: 600px) and (max-width: 959.99px)']) {
          this.panelOpenState = false;
        } else if (!state.matches) {
          this.panelOpenState = true;
        }
      });
  }

  get sortedPOIs() {
    let sortedPois;
    if (this.useCustomPois) {
      sortedPois = this.customPois
        .sort((a, b) => a.label > b.label ? -1 : 1)
        .sort((a, b) => a.poi.properties.level > b.poi.properties.level ? 1 : -1)
        .map(item => {
          const isInside = isPointWithinRadius(
            {lat: item.poi.geometry.coordinates[1], lng: item.poi.geometry.coordinates[0]},
            {lat: this.selectedPlace.location.lat, lng: this.selectedPlace.location.lng},
            10000
          );
          return {
            ...item.poi.properties,
            title: item.label,
            icon: this.amenities.filter(amenity => amenity.id === item.poi.properties.amenity)[0] ? this.amenities.filter(amenity => amenity.id === item.poi.properties.amenity)[0].icon : '',
            category: item.label_array[0],
            search_query: `${item.label} ${item.parent_label_combined} ${item.poi.properties.level}`,
            coordinates: item.poi.geometry.coordinates,
            isInside
          };
        })
        .filter(item => item.isInside);
    } else {
      sortedPois = this.filteredFeatures
        .filter(feature => feature.properties.usecase === 'poi')
        .sort((a, b) => a.properties.title > b.properties.title ? -1 : 1)
        .sort((a, b) => a.properties.level > b.properties.level ? 1 : -1)
        .map(item => {
          const isInside = isPointWithinRadius(
            {lat: item.geometry.coordinates[1], lng: item.geometry.coordinates[0]},
            {lat: this.selectedPlace.location.lat, lng: this.selectedPlace.location.lng},
            10000
          );
          return {
            ...item.properties,
            icon: this.amenities.filter(amenity => amenity.id === item.properties.amenity)[0] ? this.amenities.filter(amenity => amenity.id === item.properties.amenity)[0].icon : '',
            category: this.amenities.filter(amenity => amenity.id === item.properties.amenity)[0] ? this.amenities.filter(amenity => amenity.id === item.properties.amenity)[0].title : '',
            search_query: item.properties.title + ' ' + item.properties.level,
            coordinates: item.geometry.coordinates,
            isInside
          };
        })
        .filter(item => item.isInside);
    }
    return sortedPois;
  }

  poiSearchFn(term: string, item) {
    term = term.toLocaleLowerCase();
    return item.search_query.toLocaleLowerCase().indexOf(term) > -1;
  }

  onEndPointSelect(poi) {
    this.sidebarService.endPointListener.next(poi);
  }

  onStartPointSelect(poi) {
    this.sidebarService.startPointListener.next(poi);
  }

  onPlaceSelect(place) {
    this.pois = this.sortedPOIs;
    this.sidebarService.selectedPlaceListener.next(place);
  }

  onAccessibleOnlyToggle() {
    this.onlyAccessible = !this.onlyAccessible;
    this.sidebarService.accessibleOnlyToggleListener.next(this.onlyAccessible);
  }

  onLegendToggle(legend) {
    legend.active = !legend.active;
    this.sidebarService.legendToggleListener.next(legend);
  }

  togglePanel() {
    this.panelOpenState = !this.panelOpenState;
  }

}
