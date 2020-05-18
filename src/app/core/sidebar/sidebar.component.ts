import { Component, OnInit } from '@angular/core';
import { isPointWithinRadius } from 'geolib';
import { AuthService } from '../../auth/auth.service';
import { SidebarService } from './sidebar.service';
import Place from '../../map/models/place.model';

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
  placeSelectorLabel = 'Pick up a place';
  useCustomPois = false;
  customPois = [];
  showOnlyAccessibleToggle = true;
  onlyAccessible = false;
  showPoweredBy = false;

  constructor(
    private authService: AuthService,
    public sidebarService: SidebarService
  ) {
    this.currentUser = this.authService.getCurrentUser();
    this.config = this.authService.getCurrentUserConfig();
    this.currentUserData = this.authService.getCurrentUserData();
    this.places = this.currentUserData.places;
    this.floors = this.currentUserData.floors;
    this.selectedPlace = this.places.length > 0 ? this.places[0] : new Place({});
    this.features = this.currentUserData.features;
    this.filteredFeatures = [...this.currentUserData.features.features];
    this.customPois = this.currentUserData.customPois ? this.currentUserData.customPois : [];
    this.amenities = this.currentUserData.amenities;
    this.onlyAccessible = this.config.accessible_only ? this.config.accessible_only : false;
  }

  ngOnInit() {
    this.pois = this.sortedPOIs;
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
        .filter(feature => (feature.properties.usecase === 'poi' || feature.properties.type === 'poi'))
        .sort((a, b) => a.properties.title > b.properties.title ? -1 : 1)
        .sort((a, b) => a.properties.level > b.properties.level ? 1 : -1)
        .map(item => {
          const isInside = isPointWithinRadius(
            {lat: item.geometry.coordinates[1], lng: item.geometry.coordinates[0]},
            {lat: this.selectedPlace.location.lat, lng: this.selectedPlace.location.lng},
            1000
          );
          return {
            ...item,
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
    this.selectedPlace = place;
    this.pois = this.sortedPOIs;
    this.sidebarService.selectedPlaceListener.next(place);
  }

  onAccessibleOnlyToggle() {
    this.onlyAccessible = !this.onlyAccessible;
    this.sidebarService.accessibleOnlyToggleListener.next(this.onlyAccessible);
  }

}
