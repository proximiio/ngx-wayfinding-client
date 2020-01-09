import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { isPointWithinRadius } from 'geolib';

@Injectable({providedIn: 'root'})
export class SidebarService {
  public currentUser;
  public config;
  public currentUserData;
  public selectedPlace;
  public features;
  public filteredFeatures;
  public customPois;
  public amenities;
  public onlyAccessible;
  public useCustomPois = false;
  public appDrawer: any;
  public sidenavMode = 'side';
  public sidebarStatus = new Subject<boolean>();
  public startPointListener = new Subject<any>();
  public endPointListener = new Subject<any>();
  public selectedPlaceListener = new Subject<any>();
  public accessibleOnlyToggleListener = new Subject<boolean>();
  public amenityToggleListener = new Subject<string[]>();

  constructor(
    private authService: AuthService
  ) {}

  public closeSidebar() {
    this.appDrawer.close();
    this.sidebarStatus.next(this.appDrawer.opened);
  }

  public openSidebar() {
    this.appDrawer.open();
    this.sidebarStatus.next(this.appDrawer.opened);
  }

  public toggleSidebar() {
    this.appDrawer.toggle();
    this.sidebarStatus.next(this.appDrawer.opened);
  }

  getSidebarStatusListener() {
    return this.sidebarStatus.asObservable();
  }

  getStartPointListener() {
    return this.startPointListener.asObservable();
  }

  getEndPointListener() {
    return this.endPointListener.asObservable();
  }

  getSelectedPlaceListener() {
    return this.selectedPlaceListener.asObservable();
  }

  getAccessibleOnlyToggleListener() {
    return this.accessibleOnlyToggleListener.asObservable();
  }

  getAmenityToggleListener() {
    return this.amenityToggleListener.asObservable();
  }

  get sortedPOIs() {
    this.currentUser = this.authService.getCurrentUser();
    this.config = this.authService.getCurrentUserConfig();
    this.currentUserData = this.authService.getCurrentUserData();
    this.selectedPlace = this.currentUserData.defaultPlace;
    this.features = this.currentUserData.features;
    this.filteredFeatures = [...this.currentUserData.features.features];
    this.customPois = this.currentUserData.customPois ? this.currentUserData.customPois : [];
    this.amenities = this.currentUserData.amenities;
    this.onlyAccessible = this.config.accessible_only ? this.config.accessible_only : false;

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
}
