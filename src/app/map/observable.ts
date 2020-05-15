export type Observer = (event?: string, data?: any, observable?: Observable) => any;

export default class Observable {
  // tslint:disable-next-line:variable-name
  _observers: Observer[] = [];

  observe(observer: Observer) {
    this._observers.push(observer);
  }

  cancel(observer: Observer) {
    const index = this._observers.findIndex(o => o === observer);
    if (index >= 0) {
      this._observers.splice(index, 1);
    }
  }

  notify(event?: string, data?: any) {
    this._observers.forEach(observer => observer(event, data, this));
  }
}
