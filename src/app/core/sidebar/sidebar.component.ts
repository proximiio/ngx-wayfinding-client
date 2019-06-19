import { Component, OnInit } from '@angular/core';
import { isPointWithinRadius } from 'geolib';
import { AuthService } from '../../auth/auth.service';
import { SidebarService } from './sidebar.service';

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

  constructor(
    private authService: AuthService,
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
    this.amenities = this.currentUserData.amenities;
  }

  ngOnInit() {
    this.pois = this.sortedPOIs;
  }

  get sortedPOIs() {
    const sortedPois = this.filteredFeatures
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
    return sortedPois;
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

}
