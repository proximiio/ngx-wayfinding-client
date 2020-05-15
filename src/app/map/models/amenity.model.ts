import BaseModel from './base.model';

export default class Amenity extends BaseModel {
  title: string;
  icon: string;
  category: string;
  description: string;

  constructor(data: any) {
    super(data);
    this.title = data.title;
    this.icon = data.icon;
    this.category = data.category;
    this.description = data.description;
  }

  hasIcon() {
    return this.icon && this.icon.match(/data:image/);
  }
}
