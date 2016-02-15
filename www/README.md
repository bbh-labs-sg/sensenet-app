SenseNet App
============

Requirements
------------
* [Node](https://nodejs.org)
* [Android SDK](http://developer.android.com/sdk/index.html)

Setup
-----
1. Install Cordova, Babel, and Webpack: `npm -g install cordova babel-cli webpack`
2. Add Cordova platforms: `cordova platform add android` and/or `cordova platform add ios`
3. Add Cordova BluetoothSerial plugin: `cordova plugin add cordova-plugin-bluetooth-serial`
4. Add Cordova Geolocation plugin: `cordova plugin add cordova-plugin-geolocation`

Run
---
1. `cordova run android` or `cordova run ios`
