import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map.component';
import { MapRoutingModule } from './map-routing.module';
import { NgxMapboxGLModule } from 'ngx-mapbox-gl';
import { CoreModule } from '../core/core.module';
import { FontawesomeModule } from '../fontawesome.module';
import { AngularMaterialModule } from '../angular-material.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    CoreModule,
    FontawesomeModule,
    AngularMaterialModule,
    NgSelectModule,
    MapRoutingModule,
    NgxMapboxGLModule
  ],
  declarations: [
    MapComponent
  ]
})
export class MapModule {}
