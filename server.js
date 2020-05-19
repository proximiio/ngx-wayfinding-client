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
    const features = await (proximiApiInstance.get(`/${Settings.geo_version}/geo/features`));
    const amenities = await (proximiApiInstance.get(`/${Settings.geo_version}/geo/amenities`));

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
