import BaseModel from './base.model';

export default class AmenityCategory extends BaseModel {
  title: string;

  constructor(data: any) {
    super(data);
    this.title = data.title;
  }
}
