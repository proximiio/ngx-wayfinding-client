import Place from './models/place.model';
import Floor from './models/floor.model';
import Style from './models/style.model';

import { axios } from './common';

const LIMIT = 1000;

export const getStyle = async (id?: string) => {
  let url = '/v5/geo/style';
  if (id) {
    url += `s/${id}`;
  }
  const res = await axios.get(url);
  return new Style(res.data);
};

export const getStyles = async () => {
  const url = '/v5/geo/styles';
  const res = await axios.get(url);
  return res.data.map((item: any) => new Style(item));
};

export const getPlaces = async (skip: number = 0) => {
  const res = await axios.get(`/core/places?skip=${skip}&limit=${LIMIT}`);
  return res.data.map((item: any) => new Place(item));
};

export const getFloors = async (skip: number = 0, placeId?: string) => {
  const params = [ `skip=${skip}&limit=${LIMIT}` ];
  if (placeId) {
    params.push(`'place_id=${placeId}`);
  }
  const res = await axios.get(`/core/floors?${params.join('&')}`);
  const filter =  placeId ? (item: any) => item.place_id === placeId : (i: any) => i;
  return res.data.filter(filter).map((item: any) => new Floor(item)).reverse() as Floor[];
};


export const getPackage = async () => {
  const result: any = {};
  const promises = [
    getPlaces().then(places => result.places = places),
    getFloors().then(floors => result.floors = floors),
    getStyle().then(style => result.style = style),
    getStyles().then(styles => result.styles = styles)
  ];
  await Promise.all(promises);
  return result;
};

export default {
  getPackage,
  getStyle,
  getStyles,
  getPlaces,
  getFloors
};
