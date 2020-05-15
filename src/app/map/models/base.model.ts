export default class BaseModel {
  id: string;

  constructor(data: any) {
    this.id = data.id || (data.properties ? data.properties.id : undefined);
  }

  get exists() {
    return typeof this.id !== 'undefined';
  }
}
