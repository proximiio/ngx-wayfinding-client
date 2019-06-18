import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map.component';
import { MapRoutingModule } from './map-routing.module';
import { NgxMapboxGLModule } from 'ngx-mapbox-gl';
import { CoreModule } from '../core/core.module';
import { FontawesomeModule } from '../fontawesome.module';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    FontawesomeModule,
    MapRoutingModule,
    NgxMapboxGLModule
  ],
  declarations: [
    MapComponent
  ]
})
export class MapModule {}
