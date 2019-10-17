import { NgModule } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faChevronUp,
  faChevronDown,
  faSearch,
  faDotCircle,
  faEllipsisVAlt, faEllipsisH, faEllipsisV, faTimesCircle, faTimes, faSearchLocation, faMapMarkerAlt, faWheelchair, faToggleOn, faToggleOff
} from '../vendor/pro-light-svg-icons';

@NgModule({
  exports: [
    FontAwesomeModule
  ]
})
export class FontawesomeModule {
  constructor() {
    // Add an icon to the library for convenient access in other components
    library.add(
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
      faToggleOn
    );
  }
}
