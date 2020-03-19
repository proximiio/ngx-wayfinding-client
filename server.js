var http = require('http');
var express = require('express');
var app = express();
var Settings = require('./settings');
var httpPort = process.env.PORT || Settings.port;
var bodyParser = require('body-parser');
var cors = require('cors');
var axios = require('axios');
var _ = require('lodash');
var path = require('path');
var async = require('asyncawait/async');
var await = require('asyncawait/await');

const proximiApiInstance = axios.create({
  baseURL: Settings.proximi_api
});
proximiApiInstance.defaults.headers.common['Authorization'] = `Bearer ${Settings.token}`;

app.use(cors());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.use(Settings.basepath, express.static(__dirname + '/dist/ngx-wayfinding-client'));

app.get(Settings.basepath+'/token', function(request, response) {
  response.send(Settings.token);
});

app.get(Settings.basepath+'/auth', async (function(request, response, next) {
  try {
    const currentUser = await (proximiApiInstance.get(`/core/current_user`));
    const config = await (proximiApiInstance.get(`/config`));
    const floors = await (proximiApiInstance.get(`/core/floors`));
    const places = await (proximiApiInstance.get(`/core/places`));
    const features = await (proximiApiInstance.get(`/v4/geo/features`));
    const amenities = await (proximiApiInstance.get(`/v4/geo/amenities`));
    const ads = [{
      feature_id: 'cf45a839-9a62-4cbb-8db5-9c5390d517d6:a56ba816-a03c-4855-9858-78585d74fe6c',
      coordinates: [24.883181030680845, 60.1536962787558],
      type: 'discount',
      amount: '-50%',
      title: 'bananas ad title',
      content: 'ad content',
      image: 'http://image.com',
      link: 'http://link.com'
    }, {
      feature_id: 'cf45a839-9a62-4cbb-8db5-9c5390d517d6:0538d8a7-7ff8-4d65-bbe2-a944ed55a803',
      coordinates: [24.883519153142657, 60.15385391598744],
      type: 'special_price',
      amount: '62€',
      title: 'doggo food ad title',
      content: 'ad content',
      image: 'http://image.com',
      link: 'http://link.com'
    }, {
      feature_id: 'cf45a839-9a62-4cbb-8db5-9c5390d517d6:a013a44b-48b6-441e-ba70-44c3907635a0',
      coordinates: [24.883982826687514, 60.153783661515405],
      type: 'discount',
      amount: '-20%',
      title: 'baguette ad title',
      content: 'ad content',
      image: 'http://image.com',
      link: 'http://link.com'
    }];

    features.data.features = features.data.features.map(feature => {
      if (!feature.properties.title) {
        feature.properties.title = '';
      }
      return feature;
    });

    const defaultLevel = config.data.default_floor_number ? config.data.default_floor_number : 0;
    const defaultFloor = floors.data.filter(floor => floor.level === defaultLevel)[0];
    const defaultPlace = places.data.filter(place => place.id === defaultFloor.place_id)[0];

    response.send({
      user: currentUser.data,
      config: config.data,
      data: {
        floors: _.sortBy(floors.data, ['level']),
        places: places.data,
        features: features.data,
        amenities: amenities.data,
        ads: ads,
        defaultFloor: defaultFloor,
        defaultPlace: defaultPlace
      }
    });
  } catch (error) {
    next(error);
  }
}));

app.get(Settings.basepath+'/*', function(req,res) {
  res.sendFile(path.join(__dirname,'dist/ngx-wayfinding-client/index.html'));
});

app.post(Settings.basepath+'/analytics/ahoy/visits', function(request, res) {
  const data = request.body;
  data.type = 'ahoy-visit';
  proximiApiInstance.post(`/v4/geo/metrics`, data).then(function (response) {
    res.send(response.data);
  })
  .catch(function (error) {
    console.log(error);
    res.send(error);
  });
});

app.post(Settings.basepath+'/analytics/ahoy/events', function(request, res) {
  const data = request.body;
  data.type = 'ahoy-event';
  proximiApiInstance.post(`/v4/geo/metrics`, data).then(function (response) {
    res.send(response.data);
  })
  .catch(function (error) {
    console.log(error);
    res.send(error);
  });
});

const server = http.createServer(app);
server.listen(httpPort, '127.0.0.1', function() {
  console.log(`** Production Server is listening on localhost:${httpPort}, open your browser on http://localhost:${httpPort}${Settings.basepath} **`)
});
