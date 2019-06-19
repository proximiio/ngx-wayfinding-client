# Proximi.io Wayfinding Client

This is [Proximi.io](https://proximi.io/) wayfinding client application powered with Angular 8.

As first step please run

```
npm install
```

to install all dependencies, this is required only for the first time after cloning this source.

## Running production environment & settings

As first it's required to fill the `token` variable in `settings.js` file with yours proximi.io master token. Without it, application would not be able to log in.

In the same file you can also change `port` and `basepath` variables but it's necessary to do subsequently changes to `./src/environments` files and `./angular.json` file on line 26 (a.k.a 'baseHref' property). These steps are completely optional.

To run production server you should run
```
node server.js
```

After that with default settings, wayfinding app should be available at `http://localhost:6001/wayfinding`.

## Development server

For development process it's necessary to keep production server running as it's also serving the authentication.

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/wayfinding`. The app will automatically reload if you change any of the source files.

## Customizations

You can change whatever you want in `./src/app` folder as long you know what are you doing.

Mainly be careful with the `*.component.ts`, `*.service.ts` and other angular core files like `*.module.ts` etc. It's not necessary to change there anything unless again you know what you are doing.

#### Sidebar Styling

##### Logo

If you want to use your custom logo at the sidebar, you have to edit `./src/app/core/sidebar/sidebar.html` file. You'll be interested in line [number 6](https://github.com/proximiio/ngx-wayfinding-client/blob/master/src/app/core/sidebar/sidebar.component.html#L6).

```
  <img [src]="config.logo ? config.logo : 'assets/proximiio-logo-vertical.png'">
```

For example you can change it to something like this
```
<img src="assets/my-custom-logo.png">
```

Don't forget to place `my-custom-logo.png` to `./src/assets` folder.

##### Background color

To change background color of sidebar open `./src/app/app.component.html` and edit line [number 4](https://github.com/proximiio/ngx-wayfinding-client/blob/master/src/app/app.component.html#L4).

```
[ngStyle]="{'background-color': currentUserConfig ? currentUserConfig.primary_color : ''}"
```

for example to something like this
```
[ngStyle]="{'background-color': 'red'}"
```

This will turn the sidebar background color to disgusting red one.

##### Changing material dark theme to light

In case you are using bright color for sidebar background, you'll probably find out that POI's selects are badly visible. That's because as default the application is using dark version of material theme.

To change that to the light one, which turns the form inputs to darker color all you have to do is change `$theme` variable in `./src/app/app.component.ts` at line [number 18](https://github.com/proximiio/ngx-wayfinding-client/blob/master/src/app/app.component.ts#L18) from `default-theme` to `custom-theme`.

You can also play with the colors of theme in `./src/themes/custom-theme.scss` if you wish so.

For more information about material theming visit this [page](https://material.angular.io/guides).

Default material color palette can be found [here](https://material.io/archive/guidelines/style/color.html#color-color-tool).

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.
