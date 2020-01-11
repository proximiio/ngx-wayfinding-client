import { Component, OnInit } from '@angular/core';
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
  showPlaceSelector = false;
  useCustomPois = false;
  showStartPointPicker = false;
  customPois = [];
  showOnlyAccessibleToggle = false;
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
    this.selectedPlace = this.currentUserData.defaultPlace;
    this.features = this.currentUserData.features;
    this.filteredFeatures = [...this.currentUserData.features.features];
    this.customPois = this.currentUserData.customPois ? this.currentUserData.customPois : [];
    this.amenities = this.currentUserData.amenities;
    this.onlyAccessible = this.config.accessible_only ? this.config.accessible_only : false;
  }

  ngOnInit() {
    this.pois = this.sidebarService.sortedPOIs;
  }

  onStartPointSelect(poi) {
    this.sidebarService.startPointListener.next(poi);
  }

  onPlaceSelect(place) {
    // this.pois = this.sortedPOIs;
    this.sidebarService.selectedPlaceListener.next(place);
  }

  onAccessibleOnlyToggle() {
    this.onlyAccessible = !this.onlyAccessible;
    this.sidebarService.accessibleOnlyToggleListener.next(this.onlyAccessible);
  }

}
