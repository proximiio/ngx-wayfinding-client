import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { SidebarService } from './sidebar.service';
import { Subscription } from 'rxjs';

export interface AmenityToggleModel {
  label: string;
  icon: string;
  amenities: string[];
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
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
  endPointLabel = 'Etsi kartalta';
  startPointLabel = 'Where are you now?';
  placeSelectorLabel = 'Pick up a place';
  useCustomPois = false;
  showStartPointPicker = false;
  customPois = [];
  showOnlyAccessibleToggle = false;
  onlyAccessible = false;
  showPoweredBy = false;
  endPoi;
  amenityToggles: AmenityToggleModel[] = [{
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
    amenities: ['235390d4-ad06-4b5b-b73b-ab9f02a5e648', '892f8ded-5ad3-4876-9c7b-8b008eec9fde']
  }, {
    label: 'Kaikki kohteet',
    icon: 'assets/kaikki_kohteet.svg',
    amenities: ['all']
  }];
  activeAmenitiesToggle;
  private subs: Subscription[] = [];

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
    this.subs.push(
      this.sidebarService.getEndPointListener().subscribe(poi => {
        this.endPoi = poi ? poi : null;
      })
    );
    this.pois = this.sidebarService.sortedPOIs;
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
    // this.pois = this.sortedPOIs;
    this.sidebarService.selectedPlaceListener.next(place);
  }

  onAccessibleOnlyToggle() {
    this.onlyAccessible = !this.onlyAccessible;
    this.sidebarService.accessibleOnlyToggleListener.next(this.onlyAccessible);
  }

  onAmenityToggle(item: AmenityToggleModel) {
    this.activeAmenitiesToggle = this.activeAmenitiesToggle === item.amenities ? null : item.amenities;
    this.sidebarService.amenityToggleListener.next(this.activeAmenitiesToggle);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

}
