import BaseModel from './base.model';

export default class Place extends BaseModel {
  name: string;
  address: string;
  lat: number;
  lng: number;

  constructor(data: any) {
    super(data);
    this.name = data.name;
    this.address = data.address;
    this.lat = data.location ? data.location.lat : 60.1669635;
    this.lng = data.location ? data.location.lng : 24.9217484;
  }

  get hasLocation() {
    return !isNaN(this.lat) && !isNaN(this.lng);
  }
}
