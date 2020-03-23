import { NgModule } from '@angular/core';

import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faChevronUp,
  faChevronDown,
  faSearch,
  faDotCircle,
  faEllipsisVAlt,
  faEllipsisH,
  faEllipsisV,
  faTimesCircle,
  faTimes,
  faSearchLocation,
  faMapMarkerAlt,
  faWheelchair,
  faToggleOn,
  faToggleOff,
  faBars,
} from '../vendor/pro-light-svg-icons';

import {
  faShoppingBasket,
  faBurgerSoda, faMapMarkedAlt, faClock
} from '../vendor/pro-duotone-svg-icons';

@NgModule({
  exports: [
    FontAwesomeModule
  ]
})
export class FontawesomeModule {
  constructor(library: FaIconLibrary) {
    // Add an icon to the library for convenient access in other components
    library.addIcons(
      faChevronUp,
      faChevronDown,
      faSearch,
      faDotCircle,
      faEllipsisVAlt,
      faEllipsisH,
      faEllipsisV,
      faTimesCircle,
      faTimes,
      faSearchLocation,
      faMapMarkerAlt,
      faWheelchair,
      faToggleOff,
      faToggleOn,
      faShoppingBasket,
      faBurgerSoda,
      faMapMarkedAlt,
      faClock,
      faBars
    );
  }
}
