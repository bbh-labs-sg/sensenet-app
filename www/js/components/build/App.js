'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _flux = require('flux');

var _flux2 = _interopRequireDefault(_flux);

var _pusherJs = require('pusher-js');

var _pusherJs2 = _interopRequireDefault(_pusherJs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } // React

// Flux

var dispatcher = new _flux2.default.Dispatcher();

// Pusher

var pusher = null,
    channel = null;

// Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiamFja3liIiwiYSI6ImI0NDE5NjdmMWYzMjM5YzQyMzUxNzkyOGUwMzgzZmNjIn0.7-uee1Olm9EI4cT04c6gQw';

// Sensor data buffer
var sensorDataBuffer = undefined;

var STATE_NOT_CONNECTED = 0,
    STATE_LISTING_DEVICES = 1,
    STATE_CONNECTING = 2,
    STATE_CONNECTED = 3;

var LOOK_FOR_DEVICE_INTERVAL = 5000;

function goto(page) {
	dispatcher.dispatch({
		type: 'goto',
		page: page
	});
}

function norm(value, min, max) {
	value = !!value ? value : 0;
	if (value < min) {
		value = min;
	} else if (value > max) {
		value = max;
	}
	return (value - min) / (max - min);
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
			readings: [null, null, null, null, null, null, null, null, null, null],
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
			return _react2.default.createElement(
				'div',
				{ id: 'app', className: 'flex column one' },
				_react2.default.createElement(Navbar, null),
				_react2.default.createElement(Dashboard, { readings: this.state.readings, connected: this.state.deviceState == STATE_CONNECTED }),
				_react2.default.createElement(DeviceManager, { ref: 'deviceManager', deviceID: this.state.deviceID, deviceState: this.state.deviceState }),
				_react2.default.createElement(NetworkManager, { ref: 'networkManager' })
			);
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this2 = this;

			this.listenerID = dispatcher.register(function (payload) {
				switch (payload.type) {
					case 'reloadCurrentUser':
						_this2.reloadCurrentUser();
						break;
					case 'sensorReading':
						var readings = _this2.state.readings;
						readings.push(payload.reading);
						readings.shift();
						_this2.setState({ readings: readings });
						break;
					case 'deviceID':
						_this2.setState({ deviceID: payload.deviceID });
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
		}, _this3.initiateSendSensorReading = function (data) {
			dispatcher.dispatch({
				type: 'sendSensorReading',
				data: data
			});
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
				reading = _this3.parseData(workBuffer);

				start = end + 1;
				end = indexOf(indexArray, 0x0A0D, start);
			}

			if (reading) {
				_this3.sendData(reading);
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
			_this3.data.deviceID = _this3.props.deviceID;
			_this3.data.coordinates = position.coords;
			_this3.initiateSendSensorReading(_this3.data);
		}, _this3.onGetCurrentPositionError = function (error) {
			toastr.error('GPS Failed', 'Try going outdoors to get better GPS signal.', { timeOut: 1000 });
		}, _this3.parseData = function (buffer) {
			// Device ID
			var deviceID = String.fromCharCode.apply(null, new Uint8Array(buffer, 0, 10));

			// Float values
			// ------------
			// values[0] => Temperature
			// values[1] => Humidity
			// values[2] => UV
			// values[3] => Particles
			var values = new Float32Array(buffer.slice(10, 26));

			// Carbon Monoxide		
			var carbonMonoxide = new Int16Array(buffer, 26, 1);

			return {
				deviceID: deviceID,
				temperature: values[0],
				humidity: values[1],
				uv: values[2],
				particles: values[3],
				carbonMonoxide: carbonMonoxide
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
		key: 'sendData',
		value: function sendData(reading) {
			dispatcher.dispatch({
				type: 'sensorReading',
				reading: {
					deviceID: reading.deviceID,
					temperature: reading.temperature,
					humidity: reading.humidity,
					uv: reading.uv,
					particles: reading.particles,
					carbonMonoxide: reading.carbonMonoxide
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

		return _ret3 = (_temp3 = (_this5 = _possibleConstructorReturn(this, (_Object$getPrototypeO3 = Object.getPrototypeOf(NetworkManager)).call.apply(_Object$getPrototypeO3, [this].concat(args))), _this5), _this5.onPause = function () {}, _this5.onResume = function () {}, _this5.initiateSendSensorReading = function (data) {
			// For real-time viewers
			//this.sendSensorReadingRealtime(data);

			// For permanent storage
			//this.sendSensorReading(data);
		}, _this5.postDummyData = function () {
			var coordinates = {
				latitude: 1.25 + Math.random() * 0.15,
				longitude: 103.65 + Math.random() * 0.3
			};

			var data = {
				deviceID: '71GM9xi757',
				temperature: 28 + Math.random() * 10,
				humidity: Math.random() * 100,
				uv: Math.random() * 15,
				carbonMonoxide: Math.random() * 1024,
				particles: Math.random() * 1024,
				coordinates: coordinates
			};

			_this5.initiateSendSensorReading(data);
		}, _temp3), _possibleConstructorReturn(_this5, _ret3);
	}

	_createClass(NetworkManager, [{
		key: 'render',
		value: function render() {
			return null;
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this6 = this;

			this.listenerID = dispatcher.register(function (payload) {
				switch (payload) {
					case 'sendSensorReading':
						_this6.initiateSendSensorReading(payload.data);break;
				}
			});

			//if (this.props.loggedIn) {
			//	for (let i = 0; i < 100; i++) {
			//		this.postDummyData();
			//	}
			//}
		}
	}, {
		key: 'componentDidUpdate',
		value: function componentDidUpdate() {
			//if (this.props.loggedIn) {
			//	for (let i = 0; i < 100; i++) {
			//		this.postDummyData();
			//	}
			//}
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			dispatcher.unregister(this.listenerID);
		}
	}, {
		key: 'sendSensorReading',
		value: function sendSensorReading(data) {
			if (!data) return;

			$.ajax({
				url: 'https://sensenet.bbh-labs.com.sg/reading',
				method: 'POST',
				data: data
			});
		}
	}, {
		key: 'sendSensorReadingRealtime',
		value: function sendSensorReadingRealtime(data) {
			if (!data) return;

			channel.trigger('client-reading', {
				deviceID: deviceID,
				data: data,
				coordinates: coordinates
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

var Dashboard = function (_React$Component4) {
	_inherits(Dashboard, _React$Component4);

	function Dashboard() {
		var _Object$getPrototypeO4;

		var _temp4, _this7, _ret4;

		_classCallCheck(this, Dashboard);

		for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
			args[_key4] = arguments[_key4];
		}

		return _ret4 = (_temp4 = (_this7 = _possibleConstructorReturn(this, (_Object$getPrototypeO4 = Object.getPrototypeOf(Dashboard)).call.apply(_Object$getPrototypeO4, [this].concat(args))), _this7), _this7.state = {
			page: 'my-device'
		}, _temp4), _possibleConstructorReturn(_this7, _ret4);
	}

	_createClass(Dashboard, [{
		key: 'render',
		value: function render() {
			var page = null;

			switch (this.state.page) {
				case 'overview':
					page = _react2.default.createElement(Overview, null);break;
				case 'my-device':
					page = _react2.default.createElement(MyDevice, { connected: this.props.connected, readings: this.props.readings });break;
			}

			return page;
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this8 = this;

			this.listenerID = dispatcher.register(function (payload) {
				switch (payload.type) {
					case 'goto':
						_this8.setState({ page: payload.page });break;
				}
			});
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			dispatcher.unregister(this.listenerID);
		}
	}]);

	return Dashboard;
}(_react2.default.Component);

var Overview = function (_React$Component5) {
	_inherits(Overview, _React$Component5);

	function Overview() {
		_classCallCheck(this, Overview);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(Overview).apply(this, arguments));
	}

	_createClass(Overview, [{
		key: 'render',
		value: function render() {
			return _react2.default.createElement('div', { id: 'map', className: 'flex column one' });
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.drawMap();
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			window.map.remove();
			window.map = null;
		}
	}, {
		key: 'drawMap',
		value: function drawMap(geojson) {
			var map = new mapboxgl.Map({
				container: 'map',
				style: 'mapbox://styles/jackyb/cijmshu7s00mdbolxqpd5f5pz',
				center: [103.83888, 1.29094],
				zoom: 13
			});

			window.map = map;
		}
	}]);

	return Overview;
}(_react2.default.Component);

var MyDevice = function (_React$Component6) {
	_inherits(MyDevice, _React$Component6);

	function MyDevice() {
		var _Object$getPrototypeO5;

		var _temp5, _this10, _ret5;

		_classCallCheck(this, MyDevice);

		for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
			args[_key5] = arguments[_key5];
		}

		return _ret5 = (_temp5 = (_this10 = _possibleConstructorReturn(this, (_Object$getPrototypeO5 = Object.getPrototypeOf(MyDevice)).call.apply(_Object$getPrototypeO5, [this].concat(args))), _this10), _this10.updateCanvas = function () {
			var canvas = _this10.refs.canvas;
			var context = canvas.getContext('2d');
			var width = canvas.width = canvas.offsetWidth;
			var height = canvas.height = canvas.offsetHeight;

			context.fillStyle = 'black';
			context.fillRect(0, 0, canvas.width, canvas.height);

			var readings = _this10.props.readings;
			var cellWidth = width / readings.length;
			var cellHeight = height / readings.length;

			for (var i in readings) {
				var cellX = cellWidth * i;
			}
		}, _temp5), _possibleConstructorReturn(_this10, _ret5);
	}

	_createClass(MyDevice, [{
		key: 'render',
		value: function render() {
			var connected = this.props.connected;
			return _react2.default.createElement(
				'div',
				{ className: 'flex one column sensenode z-depth-2' },
				_react2.default.createElement(
					'h5',
					null,
					'My Device'
				),
				_react2.default.createElement('canvas', { ref: 'canvas' }),
				connected ? _react2.default.createElement(
					'button',
					{ onClick: this.disconnectDevice },
					'Disconnect Device'
				) : _react2.default.createElement(
					'button',
					{ onClick: this.connectDevice },
					'Connect Device'
				)
			);
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.updateCanvas();
		}
	}, {
		key: 'componentDidUpdate',
		value: function componentDidUpdate() {
			this.updateCanvas();
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

var Navbar = function (_React$Component7) {
	_inherits(Navbar, _React$Component7);

	function Navbar() {
		_classCallCheck(this, Navbar);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(Navbar).apply(this, arguments));
	}

	_createClass(Navbar, [{
		key: 'render',
		value: function render() {
			return _react2.default.createElement(
				'nav',
				{ className: 'navbar' },
				_react2.default.createElement(
					'ul',
					{ className: 'navbar-menu flex row' },
					_react2.default.createElement(
						'li',
						{ className: 'flex navbar-menu-item' },
						_react2.default.createElement(
							'a',
							{ href: '#', onClick: goto.bind(null, 'overview') },
							'Overview'
						)
					),
					_react2.default.createElement(
						'li',
						{ className: 'flex navbar-menu-item' },
						_react2.default.createElement(
							'a',
							{ href: '#', onClick: goto.bind(null, 'my-device') },
							'My Device'
						)
					)
				)
			);
		}
	}]);

	return Navbar;
}(_react2.default.Component);

_reactDom2.default.render(_react2.default.createElement(App, null), document.getElementById('root'));