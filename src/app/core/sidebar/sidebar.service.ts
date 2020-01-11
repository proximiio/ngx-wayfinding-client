import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { isPointWithinRadius } from 'geolib';
import { AmenityToggleModel } from '../amenity-toggle.model';

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
  public endPointLabel = 'Etsi kartalta';
  public startPointLabel = 'Where are you now?';
  public placeSelectorLabel = 'Pick up a place';
  public amenityToggles: AmenityToggleModel[] = [{
    label: 'Ilmoittautuminen',
    icon: 'assets/ilmoittautuminen.svg',
    amenities: ['ebc23e34-98e4-4f84-b1ac-52fe9419d1cb']
  }, {
    label: 'Asiakaspalvelu',
    icon: 'assets/asiakaspalvelu.svg',
    amenities: ['42c68c37-d50f-4a36-9077-849aae3a90bf']
  }, {
    label: 'Palvelut',
    icon: 'assets/palvelut.png',
    amenities: ['9c354cbc-626c-48b5-9013-b5a38b4b72e2', '5cc85e40-6473-40e6-a656-3bbd3795a7cf', '6eb57c98-0771-4ea9-b6f5-285668782ec3']
  }, {
    label: 'Asiakas-wc',
    icon: 'assets/wc.svg',
    amenities: ['caf562af-86e6-49d3-ad7a-e91431c6a303', '55b2b397-695b-40a4-982f-70e0792faa72']
  }, {
    label: 'Lastenhoitotilat',
    icon: 'assets/lastenhoitotilat.svg',
    amenities: ['9dc430bc-ab7b-4ac1-95c8-5b353b806a53', '2cce4806-e41d-4ca1-978c-72e7f3414ba2']
  }, {
    label: 'Parkkipaikat',
    icon: 'assets/parkkipaikat.svg',
    amenities: ['f6ac31f1-9746-47f2-8c9a-a44ef5f655fa', 'bdd6d838-ecad-4e5a-b4c7-04180ec22fe7', '3c53ede2-cf62-47e2-b6a8-3ee720959b9e']
  }, {
    label: 'Julkinen liikenne',
    icon: 'assets/julkinen_liikenne.svg',
    amenities: ['235390d4-ad06-4b5b-b73b-ab9f02a5e648', '892f8ded-5ad3-4876-9c7b-8b008eec9fde', '855b0d30-99ef-4745-9447-9c11ec6dd564', '3c53ede2-cf62-47e2-b6a8-3ee720959b9e']
  }, {
    label: 'Kaikki kohteet',
    icon: 'assets/kaikki_kohteet.svg',
    amenities: ['all']
  }];
  public activeAmenitiesToggle;
  public endPoi;
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

  onEndPointSelect(poi) {
    this.endPoi = poi ? poi : null;
    this.endPointListener.next(poi);
  }

  poiSearchFn(term: string, item) {
    term = term.toLocaleLowerCase();
    return item.search_query.toLocaleLowerCase().indexOf(term) > -1;
  }

  onAmenityToggle(item: AmenityToggleModel) {
    this.activeAmenitiesToggle = this.activeAmenitiesToggle === item.amenities ? null : item.amenities;
    this.amenityToggleListener.next(this.activeAmenitiesToggle);
  }
}
