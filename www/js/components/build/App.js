'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _flux = require('flux');

var _flux2 = _interopRequireDefault(_flux);

var _pusherJs = require('pusher-js');

var _pusherJs2 = _interopRequireDefault(_pusherJs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } // React


// Classnames


// Flux


var dispatcher = new _flux2.default.Dispatcher();

// Pusher

var pusher = null,
    channel = null;

// Sensor data buffer
var sensorDataBuffer = undefined;

var STATE_NOT_CONNECTED = 0,
    STATE_LISTING_DEVICES = 1,
    STATE_CONNECTING = 2,
    STATE_CONNECTED = 3;

var LOOK_FOR_DEVICE_INTERVAL = 5000;

function map(value, min1, max1, min2, max2) {
	return (value - min1) / (max1 - min1) * (max2 - min2) - min2;
}

function indexOf(array, value) {
	var start = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

	for (var i = start; i < array.length; i++) {
		if (array[i] === value) {
			return i;
		}
	}
	return -1;
}

var App = function (_React$Component) {
	_inherits(App, _React$Component);

	function App() {
		var _Object$getPrototypeO;

		var _temp, _this, _ret;

		_classCallCheck(this, App);

		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_Object$getPrototypeO = Object.getPrototypeOf(App)).call.apply(_Object$getPrototypeO, [this].concat(args))), _this), _this.state = {
			reading: null,
			deviceID: null,
			deviceState: STATE_NOT_CONNECTED
		}, _this.onPause = function () {
			_this.refs.deviceManager.onPause();
			_this.refs.networkManager.onPause();
		}, _this.onResume = function () {
			_this.refs.deviceManager.onResume();
			_this.refs.networkManager.onResume();
		}, _temp), _possibleConstructorReturn(_this, _ret);
	}

	_createClass(App, [{
		key: 'render',
		value: function render() {
			var connected = this.state.deviceState == STATE_CONNECTED;
			return _react2.default.createElement(
				'div',
				{ id: 'app', className: 'flex column one' },
				_react2.default.createElement(MyDevice, { reading: this.state.reading, connected: connected }),
				_react2.default.createElement(DeviceManager, { ref: 'deviceManager', deviceID: this.state.deviceID, deviceState: this.state.deviceState }),
				_react2.default.createElement(NetworkManager, { ref: 'networkManager', reading: this.state.reading })
			);
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this2 = this;

			this.listenerID = dispatcher.register(function (payload) {
				switch (payload.type) {
					case 'sensorReading':
						_this2.setState({ reading: payload.reading });
						break;
					case 'deviceState':
						_this2.setState({ deviceState: payload.deviceState });
						break;
				}
			});
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			dispatcher.unregister(this.listenerID);
		}
	}]);

	return App;
}(_react2.default.Component);

var DeviceManager = function (_React$Component2) {
	_inherits(DeviceManager, _React$Component2);

	function DeviceManager() {
		var _Object$getPrototypeO2;

		var _temp2, _this3, _ret2;

		_classCallCheck(this, DeviceManager);

		for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
			args[_key2] = arguments[_key2];
		}

		return _ret2 = (_temp2 = (_this3 = _possibleConstructorReturn(this, (_Object$getPrototypeO2 = Object.getPrototypeOf(DeviceManager)).call.apply(_Object$getPrototypeO2, [this].concat(args))), _this3), _this3.connectDevice = function () {
			bluetoothSerial.isEnabled(_this3.onBluetoothEnabled, _this3.onBluetoothDisabled);
		}, _this3.disconnectDevice = function () {
			bluetoothSerial.isConnected(function () {
				bluetoothSerial.disconnect(_this3.onBluetoothDisconnectSucceeded, _this3.onBluetoothDisconnectFailed);
			}, function () {});
		}, _this3.onBluetoothEnabled = function () {
			var state = _this3.props.deviceState;
			if (state == STATE_NOT_CONNECTED) {
				bluetoothSerial.list(_this3.onBluetoothListSucceeded, _this3.onBluetoothListFailed);
				dispatcher.dispatch({ type: 'deviceState', deviceState: STATE_LISTING_DEVICES });
				toastr.info('Looking for device..', 'If you can\'t connect to the device, try pairing with it first.', { timeOut: 2000 });
			}
		}, _this3.onBluetoothDisabled = function () {
			toastr.error('Bluetooth is not enabled', 'Please go to your phone settings and enable Bluetooth.', { timeOut: 3000 });
		}, _this3.onBluetoothDisconnectSucceeded = function () {
			toastr.success('Successfully disconnected from the device', '', { timeOut: 1000 });
			dispatcher.dispatch({ type: 'deviceState', deviceState: STATE_NOT_CONNECTED });
		}, _this3.onBluetoothDisconnectFailed = function () {
			toastr.error('Failed to disconnect the device', '', { timeOut: 3000 });
		}, _this3.onBluetoothListSucceeded = function (devices) {
			for (var i in devices) {
				if (devices[i].name == 'SenseNet') {
					dispatcher.dispatch({ type: 'deviceState', deviceState: STATE_CONNECTING });
					bluetoothSerial.connect(devices[i].address, _this3.onBluetoothConnectSucceeded, _this3.onBluetoothConnectFailed);
					return;
				}
			}

			_this3.onBluetoothConnectFailed();
		}, _this3.onBluetoothListFailed = function () {
			dispatcher.dispatch({ type: 'deviceState', deviceState: STATE_NOT_CONNECTED });
			toastr.error('Couldn\'t find a SenseNet device', '', { timeOut: 3000 });
		}, _this3.onBluetoothConnectSucceeded = function () {
			dispatcher.dispatch({ type: 'deviceState', deviceState: STATE_CONNECTED });
			bluetoothSerial.subscribeRawData(_this3.onBluetoothDataSucceeded, _this3.onBluetoothDataFailed);
			toastr.success('Connected to a SenseNet device!', '', { timeOut: 3000 });
		}, _this3.onBluetoothConnectFailed = function () {
			dispatcher.dispatch({ type: 'deviceState', deviceState: STATE_NOT_CONNECTED });
			toastr.error('Connection Failed!', 'Couldn\'t connect to the SenseNet device!', { timeOut: 3000 });
		}, _this3.onBluetoothDataSucceeded = function (rawData) {
			if (sensorDataBuffer) {
				var newSensorDataBuffer = new ArrayBuffer(sensorDataBuffer.byteLength + rawData.byteLength);
				var src1 = new Uint8Array(sensorDataBuffer);
				var src2 = new Uint8Array(rawData);
				var dst = new Uint8Array(newSensorDataBuffer);
				for (var i = 0; i < src1.length; i++) {
					dst[i] = src1[i];
				}
				for (var i = 0; i < src2.length; i++) {
					dst[i + src1.length] = src2[i];
				}
				sensorDataBuffer = newSensorDataBuffer;
			} else {
				sensorDataBuffer = rawData;
			}

			var indexArray = new Uint16Array(sensorDataBuffer);
			var start = 0;
			var end = indexOf(indexArray, 0x0A0D, start);
			var reading = undefined;

			// Have to multiply by two to convert int16 index to int8 index
			while ((end - start) * 2 >= 28) {
				var workBuffer = sensorDataBuffer.slice(start * 2, end * 2);
				reading = _this3.parseReading(workBuffer);

				start = end + 1;
				end = indexOf(indexArray, 0x0A0D, start);
			}

			if (reading && _this3.latitude && _this3.longitude) {
				reading.latitude = _this3.latitude;
				reading.longitude = _this3.longitude;
				_this3.initiateSendSensorReading(reading);
			}

			var leftoverStart = end >= 0 ? end * 2 : start * 2;
			var leftoverEnd = indexArray.length * 2;
			if (leftoverStart >= 0) {
				var leftoverBuffer = sensorDataBuffer.slice(leftoverStart, leftoverEnd);
				var newSensorDataBuffer = new ArrayBuffer(leftoverEnd - leftoverStart);
				var src = new Uint8Array(leftoverBuffer);
				var dst = new Uint8Array(newSensorDataBuffer);
				for (var i = 0; i < leftoverBuffer.byteLength; i++) {
					dst[i] = src[i];
				}
				sensorDataBuffer = newSensorDataBuffer;
			} else {
				sensorDataBuffer = null;
			}
		}, _this3.onBluetoothDataFailed = function () {
			toastr.error('Bluetooth', 'Failed to get data from the device.', { timeOut: 3000 });
		}, _this3.onGetCurrentPositionSucceeded = function (position) {
			_this3.latitude = position.coords.latitude;
			_this3.longitude = position.coords.longitude;
		}, _this3.onGetCurrentPositionError = function (error) {
			toastr.error('GPS Failed', 'Try going outdoors to get better GPS signal.', { timeOut: 1000 });
		}, _this3.parseReading = function (buffer) {
			// Device ID
			var deviceID = String.fromCharCode.apply(null, new Uint8Array(buffer, 0, 10));

			// Carbon Monoxide		
			var carbonMonoxide = new Int16Array(buffer, 26, 1);

			// Other sensor values
			var values = new Float32Array(buffer.slice(10, 26));
			var temperature = values[0];
			var humidity = values[1];
			var uv = values[2];
			var particles = values[3];

			return {
				deviceID: deviceID,
				temperature: temperature,
				humidity: humidity,
				uv: uv,
				particles: particles,
				carbonMonoxide: carbonMonoxide[0]
			};
		}, _temp2), _possibleConstructorReturn(_this3, _ret2);
	}

	_createClass(DeviceManager, [{
		key: 'render',
		value: function render() {
			return null;
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this4 = this;

			this.listenerID = dispatcher.register(function (payload) {
				switch (payload.type) {
					case 'connectDevice':
						_this4.connectDevice();break;
					case 'disconnectDevice':
						_this4.disconnectDevice();break;
				}
			});

			navigator.geolocation.watchPosition(this.onGetCurrentPositionSucceeded, this.onGetCurrentPositionError, {
				enableHighAccuracy: true,
				timeout: 5000,
				maximumAge: 0
			});
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			dispatcher.unregister(this.listenerID);
		}
	}, {
		key: 'onPause',
		value: function onPause() {}
	}, {
		key: 'onResume',
		value: function onResume() {}
	}, {
		key: 'initiateSendSensorReading',
		value: function initiateSendSensorReading(reading) {
			dispatcher.dispatch({
				type: 'sensorReading',
				reading: {
					deviceID: reading.deviceID,
					temperature: reading.temperature,
					humidity: reading.humidity,
					uv: reading.uv,
					particles: reading.particles,
					carbonMonoxide: reading.carbonMonoxide,
					latitude: reading.latitude,
					longitude: reading.longitude
				}
			});
		}
	}]);

	return DeviceManager;
}(_react2.default.Component);

var NetworkManager = function (_React$Component3) {
	_inherits(NetworkManager, _React$Component3);

	function NetworkManager() {
		var _Object$getPrototypeO3;

		var _temp3, _this5, _ret3;

		_classCallCheck(this, NetworkManager);

		for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
			args[_key3] = arguments[_key3];
		}

		return _ret3 = (_temp3 = (_this5 = _possibleConstructorReturn(this, (_Object$getPrototypeO3 = Object.getPrototypeOf(NetworkManager)).call.apply(_Object$getPrototypeO3, [this].concat(args))), _this5), _this5.onPause = function () {}, _this5.onResume = function () {}, _this5.postDummyReading = function () {
			var reading = {
				deviceID: '71GM9xi757',
				temperature: 28 + Math.random() * 10,
				humidity: Math.random() * 100,
				uv: Math.random() * 15,
				carbonMonoxide: Math.random() * 1024,
				particles: Math.random() * 1024,
				latitude: 1.25 + Math.random() * 0.15,
				longitude: 103.65 + Math.random() * 0.3
			};

			_this5.sendSensorReading(reading);
			_this5.sendSensorReadingRealtime(reading);
		}, _temp3), _possibleConstructorReturn(_this5, _ret3);
	}

	_createClass(NetworkManager, [{
		key: 'render',
		value: function render() {
			return null;
		}
	}, {
		key: 'componentDidUpdate',
		value: function componentDidUpdate() {
			this.sendSensorReading(this.props.reading);
			this.sendSensorReadingRealtime(this.props.reading);
		}
	}, {
		key: 'sendSensorReading',
		value: function sendSensorReading(reading) {
			if (!reading) return;

			toastr.info('Sending reading..', '', { timeOut: 1000 });

			$.ajax({
				url: 'https://sensenet.bbh-labs.com.sg/reading',
				method: 'POST',
				data: reading
			});
		}
	}, {
		key: 'sendSensorReadingRealtime',
		value: function sendSensorReadingRealtime(reading) {
			if (!reading) return;

			channel.trigger('client-reading', {
				deviceID: deviceID,
				reading: reading
			});
		}
	}, {
		key: 'initPusher',
		value: function initPusher() {
			pusher = new _pusherJs2.default('ae0834efadeb12c41af8', {
				authEndpoint: 'https://sensenet.bbh-labs.com.sg/pusher/auth',
				encrypted: true
			});

			channel = pusher.subscribe('private-client-reading');
			channel.bind('pusher:subscription_error', function (status) {
				console.log('error:', status);
			});
			channel.bind('client-reading', function (reading) {
				dispatcher.dispatch({
					type: 'reading',
					reading: reading
				});
			});
		}
	}, {
		key: 'destroyPusher',
		value: function destroyPusher() {
			if (pusher) {
				pusher = null;
			}

			if (channel) {
				channel.unsubscribe('private-client-reading');
				channel.unbind('pusher:subscription_error');
				channel.unbind('client-reading');
			}
		}
	}]);

	return NetworkManager;
}(_react2.default.Component);

var MyDevice = function (_React$Component4) {
	_inherits(MyDevice, _React$Component4);

	function MyDevice() {
		_classCallCheck(this, MyDevice);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(MyDevice).apply(this, arguments));
	}

	_createClass(MyDevice, [{
		key: 'render',
		value: function render() {
			var connected = this.props.connected;
			return _react2.default.createElement(
				'div',
				{ className: 'my-device flex one column' },
				connected ? _react2.default.createElement(Connected, { reading: this.props.reading }) : _react2.default.createElement(Disconnected, null)
			);
		}
	}, {
		key: 'connectDevice',
		value: function connectDevice() {
			dispatcher.dispatch({ type: 'connectDevice' });
		}
	}, {
		key: 'disconnectDevice',
		value: function disconnectDevice() {
			dispatcher.dispatch({ type: 'disconnectDevice' });
		}
	}]);

	return MyDevice;
}(_react2.default.Component);

var Connected = function (_React$Component5) {
	_inherits(Connected, _React$Component5);

	function Connected() {
		_classCallCheck(this, Connected);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(Connected).apply(this, arguments));
	}

	_createClass(Connected, [{
		key: 'render',
		value: function render() {
			var reading = this.props.reading;
			if (reading) {
				/* FOR DEBUGGING PURPOSES
    reading = {
    	temperature: 26.6,
    	humidity: 49,
    	uv: 11.57,
    	particles: 0.62,
    	carbonMonoxide: 87,
    };
    */

				var temperaturePct = map(reading.temperature, 25, 34, 0, 100);
				var humidityPct = map(reading.humidity, 50, 100, 0, 100);
				var carbonMonoxidePct = map(reading.carbonMonoxide, 0, 1024, 0, 100);
				var uvPct = map(reading.uv, 0, 15, 0, 100);
				var particlesPct = map(reading.particles, 0, 2000, 0, 100);
				var quality = ((temperaturePct + humidityPct + carbonMonoxidePct + uvPct + particlesPct) * 0.2).toFixed();
				return _react2.default.createElement(
					'div',
					{ className: 'flex column one' },
					_react2.default.createElement(
						'div',
						{ className: 'flex column one' },
						_react2.default.createElement(
							'div',
							{ className: 'flex row one align-center justify-center' },
							_react2.default.createElement('hr', { className: 'line flex one' }),
							_react2.default.createElement(
								'p',
								{ className: 'location-title' },
								'LOCATION'
							),
							_react2.default.createElement('hr', { className: 'line flex one' })
						),
						_react2.default.createElement(
							'div',
							{ className: 'flex row one align-center justify-center' },
							_react2.default.createElement(
								'h3',
								{ className: 'location' },
								'5 MAGAZINE ROAD'
							)
						)
					),
					_react2.default.createElement(
						'div',
						{ className: 'flex column two align-center justify-center' },
						_react2.default.createElement(
							'div',
							{ className: (0, _classnames2.default)('air-quality-container flex column align-center justify-center', this.qualityColor(quality)) },
							_react2.default.createElement(
								'h3',
								{ className: 'air-quality-status' },
								this.airQualityStatus(quality)
							),
							_react2.default.createElement(
								'h1',
								{ className: 'air-quality-score' },
								quality
							)
						),
						_react2.default.createElement(
							'h3',
							{ className: 'air-quality-label' },
							'AIR QUALITY'
						)
					),
					_react2.default.createElement(
						'div',
						{ className: 'sensors flex column three justify-center' },
						_react2.default.createElement(Sensor, { label: 'Temperature', percentage: temperaturePct, value: reading.temperature }),
						_react2.default.createElement(Sensor, { label: 'Humidity', percentage: humidityPct, value: reading.humidity }),
						_react2.default.createElement(Sensor, { label: 'Carbon Monoxide', percentage: carbonMonoxidePct, value: reading.carbonMonoxide }),
						_react2.default.createElement(Sensor, { label: 'UV', percentage: uvPct, value: reading.uv }),
						_react2.default.createElement(Sensor, { label: 'Particles', percentage: particlesPct, value: reading.particles })
					),
					_react2.default.createElement(
						'div',
						{ className: 'flex one align-center justify-center' },
						_react2.default.createElement(
							'button',
							{ className: 'disconnect-button', onClick: this.disconnect },
							'DISCONNECT'
						)
					)
				);
			}
			return _react2.default.createElement(
				'div',
				null,
				'No reading!'
			);
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.listenerID = dispatcher.register(function (payload) {
				switch (payload.type) {
					case 'GPSPosition':
						var lat = payload.latitude;
						var lon = payload.longitude;
						$.getJSON('nominatim.openstreetmap.org/reverse', { format: 'json', json_callback: '?', lat: lat, lon: lon }, function (data) {
							alert(JSON.stringify(data));
						});
						break;
				}
			});
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			dispatcher.unregister(this.listenerID);
		}
	}, {
		key: 'airQualityStatus',
		value: function airQualityStatus(quality) {
			if (quality < 20) {
				return 'VERY CLEAN';
			} else if (quality < 40) {
				return 'CLEAN';
			} else if (quality < 60) {
				return 'POLLUTED';
			} else if (quality < 80) {
				return 'HAZARDOUS';
			} else {
				return 'VERY HAZARDOUS';
			}
		}
	}, {
		key: 'qualityColor',
		value: function qualityColor(quality) {
			if (quality < 20) {
				return 'very-low';
			} else if (quality < 40) {
				return 'low';
			} else if (quality < 60) {
				return 'medium';
			} else if (quality < 80) {
				return 'high';
			} else {
				return 'very-high';
			}
		}
	}, {
		key: 'disconnect',
		value: function disconnect() {
			dispatcher.dispatch({ type: 'disconnectDevice' });
		}
	}]);

	return Connected;
}(_react2.default.Component);

var Sensor = function (_React$Component6) {
	_inherits(Sensor, _React$Component6);

	function Sensor() {
		var _Object$getPrototypeO4;

		var _temp4, _this8, _ret4;

		_classCallCheck(this, Sensor);

		for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
			args[_key4] = arguments[_key4];
		}

		return _ret4 = (_temp4 = (_this8 = _possibleConstructorReturn(this, (_Object$getPrototypeO4 = Object.getPrototypeOf(Sensor)).call.apply(_Object$getPrototypeO4, [this].concat(args))), _this8), _this8.barLabel = function () {
			var percentage = _this8.props.percentage;
			if (percentage < 20) {
				return 'very-low';
			} else if (percentage < 40) {
				return 'low';
			} else if (percentage < 60) {
				return 'medium';
			} else if (percentage < 80) {
				return 'high';
			} else {
				return 'very-high';
			}
		}, _temp4), _possibleConstructorReturn(_this8, _ret4);
	}

	_createClass(Sensor, [{
		key: 'render',
		value: function render() {
			return _react2.default.createElement(
				'div',
				{ className: 'sensor flex row' },
				_react2.default.createElement(
					'h3',
					{ className: 'sensor-label flex' },
					this.props.label
				),
				_react2.default.createElement(
					'div',
					{ className: 'flex one' },
					_react2.default.createElement('span', { className: (0, _classnames2.default)('sensor-bar', this.barLabel()), style: { width: this.props.percentage + '%' } }),
					_react2.default.createElement(
						'span',
						{ className: 'sensor-value flex' },
						this.props.value.toFixed(1)
					)
				)
			);
		}
	}]);

	return Sensor;
}(_react2.default.Component);

var Disconnected = function (_React$Component7) {
	_inherits(Disconnected, _React$Component7);

	function Disconnected() {
		_classCallCheck(this, Disconnected);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(Disconnected).apply(this, arguments));
	}

	_createClass(Disconnected, [{
		key: 'render',
		value: function render() {
			return _react2.default.createElement(
				'div',
				{ className: 'disconnected flex column one' },
				_react2.default.createElement(
					'div',
					{ className: 'flex column one align-center justify-center' },
					_react2.default.createElement('img', { className: 'sensenet-logo', src: 'images/sensenet.png' })
				),
				_react2.default.createElement(
					'div',
					{ className: 'flex column one align-center justify-center' },
					_react2.default.createElement('img', { className: 'device-image', src: 'images/device.png' }),
					_react2.default.createElement(
						'p',
						null,
						'Device'
					)
				),
				_react2.default.createElement(
					'div',
					{ className: 'flex column one align-center justify-center' },
					_react2.default.createElement(
						'button',
						{ className: 'connect-button', onClick: this.connect },
						'CONNECT'
					)
				)
			);
		}
	}, {
		key: 'connect',
		value: function connect() {
			dispatcher.dispatch({ type: 'connectDevice' });
		}
	}]);

	return Disconnected;
}(_react2.default.Component);

_reactDom2.default.render(_react2.default.createElement(App, null), document.getElementById('root'));