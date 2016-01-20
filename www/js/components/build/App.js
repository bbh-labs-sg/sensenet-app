'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _flux = require('flux');

var _flux2 = _interopRequireDefault(_flux);

var _parse = require('parse');

var _parse2 = _interopRequireDefault(_parse);

var _pusherJs = require('pusher-js');

var _pusherJs2 = _interopRequireDefault(_pusherJs);

var _chartist = require('chartist');

var _chartist2 = _interopRequireDefault(_chartist);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Toggle between Cordova and Web
var CORDOVA = false;

// React

// Flux

var dispatcher = new _flux2.default.Dispatcher();

// Parse

_parse2.default.initialize('9sMhGuNUapuBzG4HePZSNUmfRyDegxsXXoAjttUk', // Application ID
'D9fEaIKZDPaB9mocOj1xv9OPusKGi1AAvKu2rPi2' // JavaScript Key
);

// Pusher

var pusher = null,
    channel = null,
    presenceChannel = null;

// Chartist

// Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiamFja3liIiwiYSI6ImI0NDE5NjdmMWYzMjM5YzQyMzUxNzkyOGUwMzgzZmNjIn0.7-uee1Olm9EI4cT04c6gQw';

var STATE_NOT_CONNECTED = 0,
    STATE_LISTING_DEVICES = 1,
    STATE_CONNECTING = 2,
    STATE_CONNECTED = 3,
    STATE_NOT_FOUND = 4;

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

var ReadingObject = (function (_Parse$Object) {
	_inherits(ReadingObject, _Parse$Object);

	function ReadingObject() {
		_classCallCheck(this, ReadingObject);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(ReadingObject).call(this, 'Reading'));
	}

	return ReadingObject;
})(_parse2.default.Object);

var App = (function (_React$Component) {
	_inherits(App, _React$Component);

	function App() {
		var _Object$getPrototypeO;

		var _temp, _this2, _ret;

		_classCallCheck(this, App);

		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		return _ret = (_temp = (_this2 = _possibleConstructorReturn(this, (_Object$getPrototypeO = Object.getPrototypeOf(App)).call.apply(_Object$getPrototypeO, [this].concat(args))), _this2), _this2.state = {
			user: null
		}, _this2.onPause = function () {
			_this2.refs.deviceManager.onPause();
			_this2.refs.networkManager.onPause();
		}, _this2.onResume = function () {
			_this2.refs.deviceManager.onResume();
			_this2.refs.networkManager.onResume();
		}, _this2.reloadCurrentUser = function () {
			var currentUser = _parse2.default.User.current();
			if (currentUser) {
				_this2.refs.networkManager.initPusher();
			} else {
				_this2.refs.networkManager.destroyPusher();
			}
			_this2.setState({ user: currentUser });
		}, _temp), _possibleConstructorReturn(_this2, _ret);
	}

	_createClass(App, [{
		key: 'render',
		value: function render() {
			var user = this.state.user;
			return _react2.default.createElement(
				'div',
				{ id: 'app', className: 'flex column one' },
				user ? _react2.default.createElement(Navbar, null) : null,
				user ? _react2.default.createElement(Dashboard, null) : _react2.default.createElement(Authentication, null),
				_react2.default.createElement(DeviceManager, { ref: 'deviceManager', loggedIn: !!user }),
				_react2.default.createElement(NetworkManager, { ref: 'networkManager', loggedIn: !!user })
			);
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this3 = this;

			this.reloadCurrentUser();

			if (CORDOVA) {
				document.addEventListener('pause', this.onPause, false);
				document.addEventListener('resume', this.onResume, false);
				this.onResume();
			}

			this.listenerID = dispatcher.register(function (payload) {
				switch (payload.type) {
					case 'reloadCurrentUser':
						_this3.reloadCurrentUser();break;
				}
			});
		}
	}]);

	return App;
})(_react2.default.Component);

var DeviceManager = (function (_React$Component2) {
	_inherits(DeviceManager, _React$Component2);

	function DeviceManager() {
		var _Object$getPrototypeO2;

		var _temp2, _this4, _ret2;

		_classCallCheck(this, DeviceManager);

		for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
			args[_key2] = arguments[_key2];
		}

		return _ret2 = (_temp2 = (_this4 = _possibleConstructorReturn(this, (_Object$getPrototypeO2 = Object.getPrototypeOf(DeviceManager)).call.apply(_Object$getPrototypeO2, [this].concat(args))), _this4), _this4.state = {
			deviceState: STATE_NOT_CONNECTED,
			deviceID: null
		}, _this4.lookForDevice = function () {
			var state = _this4.state.deviceState;
			if (state == STATE_NOT_CONNECTED || state == STATE_NOT_FOUND) {
				bluetoothSerial.list(_this4.onBluetoothListSuccess, _this4.onBluetoothListFailure);
				_this4.setState({ deviceState: STATE_LISTING_DEVICES });
				toastr.info('Looking for a SenseNet device..', '', { timeOut: 2000 });
			}
		}, _this4.startLookForDevice = function () {
			if (!_this4.lookForDeviceIntervalID) {
				_this4.lookForDeviceIntervalID = setInterval(_this4.lookForDevice, 5000);
			}
		}, _this4.cancelLookForDevice = function () {
			if (_this4.lookForDeviceIntervalID) {
				clearInterval(_this4.lookForDeviceIntervalID);
			}
			_this4.lookForDeviceIntervalID = null;
		}, _this4.sendSensorReading = function (deviceID, data, coordinate) {
			dispatcher.dispatch({
				type: 'sendSensorReading',
				deviceID: deviceID, deviceID: deviceID,
				data: data,
				coordinate: coordinate
			});
		}, _this4.onBluetoothListSuccess = function (devices) {
			for (var i in devices) {
				if (devices[i].name == 'SenseNet') {
					_this4.setState({ deviceState: STATE_CONNECTING });
					bluetoothSerial.connect(devices[i].address, _this4.onBluetoothConnectSuccess, _this4.onBluetoothConnectFailure);
					return;
				}
			}
			_this4.setState({ deviceState: STATE_NOT_FOUND });
			toastr.error('Couldn\'t find a SenseNet device', '', { timeOut: 3000 });
		}, _this4.onBluetoothListFailure = function () {
			_this4.setState({ deviceState: STATE_NOT_CONNECTED });
			setTimeout(_this4.lookForDevice, 5000);
		}, _this4.onBluetoothConnectSuccess = function () {
			_this4.setState({ deviceState: STATE_CONNECTED });
			bluetoothSerial.subscribe('\r\n', _this4.onBluetoothDataSuccess, _this4.onBluetoothDataFailure);
			toastr.success('Connected to a SenseNet device!', '', { timeOut: 3000 });
		}, _this4.onBluetoothConnectFailure = function () {
			_this4.setState({ deviceState: STATE_NOT_CONNECTED });
			toastr.error('Failed to connect the SenseNet device!', '', { timeOut: 3000 });
		}, _this4.onBluetoothDataSuccess = function (rawData) {
			try {
				_this4.data = null;
				_this4.data = JSON.parse(rawData);
				navigator.geolocation.getCurrentPosition(_this4.onGetCurrentPositionSuccess, _this4.onGetCurrentPositionError, { maximumAge: 3000, timeout: 5000, enableHighAccuracy: true });
			} catch (error) {
				// do nothing
			}
		}, _this4.onBluetoothDataFailure = function () {
			// do nothing
		}, _this4.onGetCurrentPositionSuccess = function (position) {
			_this4.sendSensorReading(_this4.state.deviceID, _this4.data, position.coords);
		}, _this4.onGetCurrentPositionError = function (error) {
			toastr.error('Failed to get GPS position', '', { timeOut: 1000 });
		}, _temp2), _possibleConstructorReturn(_this4, _ret2);
	}

	_createClass(DeviceManager, [{
		key: 'render',
		value: function render() {
			return null;
		}
	}, {
		key: 'onPause',
		value: function onPause() {
			this.cancelLookForDevice();
			bluetoothSerial.disconnect();
		}
	}, {
		key: 'onResume',
		value: function onResume() {
			// Look for a device if logged in
			if (this.props.loggedIn) {
				this.startLookForDevice();
			}
		}
	}]);

	return DeviceManager;
})(_react2.default.Component);

var NetworkManager = (function (_React$Component3) {
	_inherits(NetworkManager, _React$Component3);

	function NetworkManager() {
		var _Object$getPrototypeO3;

		var _temp3, _this5, _ret3;

		_classCallCheck(this, NetworkManager);

		for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
			args[_key3] = arguments[_key3];
		}

		return _ret3 = (_temp3 = (_this5 = _possibleConstructorReturn(this, (_Object$getPrototypeO3 = Object.getPrototypeOf(NetworkManager)).call.apply(_Object$getPrototypeO3, [this].concat(args))), _this5), _this5.onPause = function () {}, _this5.onResume = function () {}, _this5.sendSensorReading = function (deviceID, data, coordinate) {
			if (!(!!deviceID && !!data && !!coordinate)) {
				return;
			}

			// For real-time viewers
			_this5.sendSensorReadingRealtime(deviceID, data, coordinate);

			// Save sensor reading to database
			var device = _parse2.default.Object.extend('Device');
			var query = new _parse2.default.Query(device);
			query.get(deviceID, {
				success: function success(device) {
					var reading = new ReadingObject();
					reading.set('data', data);
					reading.set('coordinate', new _parse2.default.GeoPoint(coordinate));
					reading.set('device', device);
					reading.save(null, {
						success: function success(reading) {
							// do nothing
						},
						error: function error(reading, _error) {
							toastr.error('Failed to upload sensor readings.', '', { timeOut: 1000 });
						}
					});
				},
				error: function error(device, _error2) {
					// do nothing
				}
			});
		}, _this5.postDummyData = function () {
			var position = {
				coords: {
					latitude: 1.25 + Math.random() * 0.15,
					longitude: 103.65 + Math.random() * 0.3
				}
			};

			var data = {
				temperature: 28 + Math.random() * 10,
				humidity: Math.random() * 100,
				uv: Math.random() * 15,
				carbonMonoxide: Math.random() * 1024,
				particles: Math.random() * 1024
			};

			_this5.sendSensorReading('71GM9xi757', data, position.coords);
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
						_this6.sendSensorReading(payload.deviceID, payload.data, payload.coordinate);break;
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
		key: 'sendSensorReadingRealtime',
		value: function sendSensorReadingRealtime(deviceID, data, coordinate) {
			channel.trigger('client-reading', {
				deviceID: deviceID,
				data: data,
				coordinate: coordinate
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

			presenceChannel = pusher.subscribe('presence-client');
			presenceChannel.bind('pusher:subscription_error', function (status) {
				console.log('error:', status);
			});
			presenceChannel.bind('pusher:subscription_succeeded', function (members) {
				dispatcher.dispatch({
					type: 'presenceSubscribed',
					members: members
				});
			});
			presenceChannel.bind('pusher:member_added', function (member) {
				dispatcher.dispatch({
					type: 'presenceAdded',
					member: member
				});
			});
			presenceChannel.bind('pusher:member_removed', function (member) {
				dispatcher.dispatch({
					type: 'presenceRemoved',
					member: member
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

			if (presenceChannel) {
				presenceChannel.unsubscribe('presence-client');
				presenceChannel.unbind('pusher:subcription_succeeded');
				presenceChannel.unbind('pusher:subcription_error');
				presenceChannel.unbind('pusher:member_added');
				presenceChannel.unbind('pusher:member_removed');
			}
		}
	}]);

	return NetworkManager;
})(_react2.default.Component);

var Authentication = (function (_React$Component4) {
	_inherits(Authentication, _React$Component4);

	function Authentication() {
		var _Object$getPrototypeO4;

		var _temp4, _this7, _ret4;

		_classCallCheck(this, Authentication);

		for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
			args[_key4] = arguments[_key4];
		}

		return _ret4 = (_temp4 = (_this7 = _possibleConstructorReturn(this, (_Object$getPrototypeO4 = Object.getPrototypeOf(Authentication)).call.apply(_Object$getPrototypeO4, [this].concat(args))), _this7), _this7.state = {
			loggingIn: false,
			signingUp: false,
			resettingPassword: false
		}, _this7.login = function (event) {
			event.preventDefault();

			_this7.setState({ loggingIn: true });

			_parse2.default.User.logIn(_this7.refs.email.value, _this7.refs.password.value, {
				success: function success(user) {
					dispatcher.dispatch({ type: 'reloadCurrentUser' });
					_this7.setState({ loggingIn: false });
				},
				error: function error(user, _error3) {
					dispatcher.dispatch({ type: 'reloadCurrentUser' });
					_this7.setState({ loggingIn: false });
				}
			});
		}, _this7.signup = function (event) {
			event.preventDefault();

			_this7.setState({ signingUp: true });

			var user = new _parse2.default.User();
			user.set('username', _this7.refs.email.value);
			user.set('email', _this7.refs.email.value);
			user.set('password', _this7.refs.password.value);
			user.signUp(null, {
				success: function success(user) {
					dispatcher.dispatch({ type: 'reloadCurrentUser' });
					_this7.setState({ signingUp: false });
					toastr.success('Successfully registered!');
				},
				error: function error(user, _error4) {
					dispatcher.dispatch({ type: 'reloadCurrentUser' });
					_this7.setState({ signingUp: false });
					toastr.error('Error: ' + _error4.code + ' ' + _error4.message);
				}
			});
		}, _this7.resetPassword = function (event) {
			event.preventDefault();

			_this7.setState({ resettingPassword: true });

			_parse2.default.User.requestPasswordReset(_this7.refs.email.value, {
				success: function success() {
					_this7.setState({ resettingPassword: false });
					toastr.success('Sent reset password link to your email address!');
				},
				error: function error(_error5) {
					_this7.setState({ resettingPassword: false });
					toastr.error('Error: ' + _error5.code + ' ' + _error5.message);
				}
			});
		}, _temp4), _possibleConstructorReturn(_this7, _ret4);
	}

	_createClass(Authentication, [{
		key: 'render',
		value: function render() {
			return _react2.default.createElement(
				'div',
				{ className: 'flex column' },
				_react2.default.createElement(
					'div',
					{ className: 'flex row' },
					_react2.default.createElement(
						'form',
						{ className: 'flex column one', action: '#' },
						_react2.default.createElement(
							'div',
							{ className: 'flex row align-center justify-center' },
							_react2.default.createElement(
								'h3',
								null,
								'SenseNet'
							)
						),
						_react2.default.createElement(
							'div',
							{ className: 'flex row align-center justify-center' },
							_react2.default.createElement(
								'div',
								{ className: 'flex column one' },
								_react2.default.createElement('input', { ref: 'email', id: 'email', type: 'email' }),
								_react2.default.createElement(
									'label',
									{ htmlFor: 'email' },
									'Email'
								)
							),
							_react2.default.createElement(
								'div',
								{ className: 'flex column one' },
								_react2.default.createElement('input', { ref: 'password', id: 'password', type: 'password' }),
								_react2.default.createElement(
									'label',
									{ htmlFor: 'password' },
									'Password'
								)
							)
						),
						_react2.default.createElement(
							'div',
							{ className: 'flex row align-center justify-center' },
							_react2.default.createElement(
								'button',
								{ onClick: this.login },
								this.state.loggingIn ? 'Logging In..' : 'Log In'
							),
							_react2.default.createElement(
								'button',
								{ onClick: this.signup },
								this.state.signingUp ? 'Signing Up..' : 'Sign Up'
							),
							_react2.default.createElement(
								'button',
								{ onClick: this.resetPassword },
								this.state.resettingPassword ? 'Resetting Password..' : 'Reset Password'
							)
						)
					)
				)
			);
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			dispatcher.dispatch({ type: 'reloadCurrentUser' });
		}
	}]);

	return Authentication;
})(_react2.default.Component);

var Dashboard = (function (_React$Component5) {
	_inherits(Dashboard, _React$Component5);

	function Dashboard() {
		var _Object$getPrototypeO5;

		var _temp5, _this8, _ret5;

		_classCallCheck(this, Dashboard);

		for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
			args[_key5] = arguments[_key5];
		}

		return _ret5 = (_temp5 = (_this8 = _possibleConstructorReturn(this, (_Object$getPrototypeO5 = Object.getPrototypeOf(Dashboard)).call.apply(_Object$getPrototypeO5, [this].concat(args))), _this8), _this8.state = {
			page: 'overview',
			devices: null
		}, _temp5), _possibleConstructorReturn(_this8, _ret5);
	}

	_createClass(Dashboard, [{
		key: 'render',
		value: function render() {
			var page = null;

			switch (this.state.page) {
				case 'overview':
					page = _react2.default.createElement(Overview, null);break;
				case 'devices':
					page = _react2.default.createElement(Devices, { devices: this.state.devices });break;
				case 'settings':
					page = _react2.default.createElement(Settings, null);break;
			}

			return page;
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this9 = this;

			var device = _parse2.default.Object.extend('Device');
			var query = new _parse2.default.Query(device);
			query.find({
				success: function success(results) {
					_this9.setState({ devices: results });
				},
				error: function error(_error6) {
					toastr.error('Failed to load devices!', '', { timeOut: 1000 });
				}
			});

			this.listenerID = dispatcher.register(function (payload) {
				switch (payload.type) {
					case 'goto':
						_this9.setState({ page: payload.page });break;
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
})(_react2.default.Component);

var Overview = (function (_React$Component6) {
	_inherits(Overview, _React$Component6);

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
})(_react2.default.Component);

var Devices = (function (_React$Component7) {
	_inherits(Devices, _React$Component7);

	function Devices() {
		_classCallCheck(this, Devices);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(Devices).apply(this, arguments));
	}

	_createClass(Devices, [{
		key: 'render',
		value: function render() {
			var devices = this.props.devices;
			var myDevice = this.props.myDevice;
			return _react2.default.createElement(
				'div',
				{ className: 'flex one column' },
				!!myDevice ? _react2.default.createElement(MyDevice, { device: myDevice }) : null,
				!!devices ? devices.map(function (device, i) {
					return _react2.default.createElement(Device, { key: device.id, device: device });
				}) : null
			);
		}
	}]);

	return Devices;
})(_react2.default.Component);

var MyDevice = (function (_React$Component8) {
	_inherits(MyDevice, _React$Component8);

	function MyDevice() {
		var _Object$getPrototypeO6;

		var _temp6, _this12, _ret6;

		_classCallCheck(this, MyDevice);

		for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
			args[_key6] = arguments[_key6];
		}

		return _ret6 = (_temp6 = (_this12 = _possibleConstructorReturn(this, (_Object$getPrototypeO6 = Object.getPrototypeOf(MyDevice)).call.apply(_Object$getPrototypeO6, [this].concat(args))), _this12), _this12.state = {
			readings: [null, null, null, null, null, null, null, null, null, null]
		}, _this12.addReading = function (reading) {
			// Put new reading into the stack
			var readings = _this12.state.readings;
			readings.push(reading);
			readings.shift();
			_this12.setState({ readings: readings });

			// Update Chartist line graph
			new _chartist2.default.Line('#my-device', {
				labels: _this12.readingLabels(),
				series: _this12.readingSeries()
			}, {
				fullWidth: true,
				lineSmooth: _chartist2.default.Interpolation.cardinal({
					fillHoles: true
				})
			});
		}, _this12.readingLabels = function () {
			return _this12.state.readings.map(function (r, i) {
				return i;
			});
		}, _this12.readingSeries = function () {
			var readings = _this12.state.readings;
			var series = [];
			var isValid = function isValid(r, property) {
				return !!r && (typeof r === 'undefined' ? 'undefined' : _typeof(r)) == 'object' && r.hasOwnProperty('data') && r.data.hasOwnProperty(property);
			};

			series.push(readings.map(function (r) {
				return isValid(r) ? r.data.temperature : 0;
			}));
			series.push(readings.map(function (r) {
				return isValid(r) ? r.data.humidity : 0;
			}));
			series.push(readings.map(function (r) {
				return isValid(r) ? r.data.carbonMonoxide * 0.1 : 0;
			}));
			series.push(readings.map(function (r) {
				return isValid(r) ? r.data.uv * 0.1 : 0;
			}));
			series.push(readings.map(function (r) {
				return isValid(r) ? r.data.particles * 0.1 : 0;
			}));

			return series;
		}, _temp6), _possibleConstructorReturn(_this12, _ret6);
	}

	_createClass(MyDevice, [{
		key: 'render',
		value: function render() {
			var device = this.props.myDevice;
			var readings = this.state.readings;
			return _react2.default.createElement(
				'div',
				{ className: 'flex one column sensenode z-depth-2' },
				_react2.default.createElement(
					'h5',
					null,
					'My SenseNode'
				),
				_react2.default.createElement('div', { className: 'ct-chart ct-golden-section', id: 'my-device' })
			);
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this13 = this;

			var device = this.props.device;

			this.listenerID = dispatcher.register(function (payload) {
				switch (payload.type) {
					case 'sendSensorReading':
						_this13.addReading(payload);
						break;
				}
			});

			// Setup Chartist line graph
			new _chartist2.default.Line('#my-device', {
				labels: this.readingLabels(),
				series: this.readingSeries()
			}, {
				fullWidth: true,
				lineSmooth: _chartist2.default.Interpolation.cardinal({
					fillHoles: true
				})
			});
		}
	}]);

	return MyDevice;
})(_react2.default.Component);

var Device = (function (_React$Component9) {
	_inherits(Device, _React$Component9);

	function Device() {
		var _Object$getPrototypeO7;

		var _temp7, _this14, _ret7;

		_classCallCheck(this, Device);

		for (var _len7 = arguments.length, args = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
			args[_key7] = arguments[_key7];
		}

		return _ret7 = (_temp7 = (_this14 = _possibleConstructorReturn(this, (_Object$getPrototypeO7 = Object.getPrototypeOf(Device)).call.apply(_Object$getPrototypeO7, [this].concat(args))), _this14), _this14.state = {
			readings: [null, null, null, null, null, null, null, null, null, null]
		}, _this14.addReading = function (reading) {
			// Put new reading into the stack
			var readings = _this14.state.readings;
			readings.push(reading);
			readings.shift();
			_this14.setState({ readings: readings });

			// Update Chartist line graph
			new _chartist2.default.Line('#' + _this14.readingID(), {
				labels: _this14.readingLabels(),
				series: _this14.readingSeries()
			}, {
				fullWidth: true,
				lineSmooth: _chartist2.default.Interpolation.cardinal({
					fillHoles: true
				})
			});
		}, _this14.readingID = function () {
			return 'reading-' + _this14.props.device.id;
		}, _this14.readingLabels = function () {
			return _this14.state.readings.map(function (r, i) {
				return i;
			});
		}, _this14.readingSeries = function () {
			var readings = _this14.state.readings;
			var series = [];
			var isValid = function isValid(r, property) {
				return !!r && (typeof r === 'undefined' ? 'undefined' : _typeof(r)) == 'object' && r.hasOwnProperty('data') && r.data.hasOwnProperty(property);
			};

			series.push(readings.map(function (r) {
				return isValid(r) ? r.data.temperature : 0;
			}));
			series.push(readings.map(function (r) {
				return isValid(r) ? r.data.humidity : 0;
			}));
			series.push(readings.map(function (r) {
				return isValid(r) ? r.data.carbonMonoxide * 0.1 : 0;
			}));
			series.push(readings.map(function (r) {
				return isValid(r) ? r.data.uv * 0.1 : 0;
			}));
			series.push(readings.map(function (r) {
				return isValid(r) ? r.data.particles * 0.1 : 0;
			}));

			return series;
		}, _temp7), _possibleConstructorReturn(_this14, _ret7);
	}

	_createClass(Device, [{
		key: 'render',
		value: function render() {
			var device = this.props.device;
			var readings = this.state.readings;
			return _react2.default.createElement(
				'div',
				{ className: 'flex one column sensenode z-depth-2' },
				_react2.default.createElement(
					'h5',
					null,
					'SenseNode'
				),
				_react2.default.createElement('div', { className: 'ct-chart ct-golden-section', id: this.readingID() })
			);
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this15 = this;

			var device = this.props.device;

			this.listenerID = dispatcher.register(function (payload) {
				switch (payload.type) {
					case 'reading':
						if (device.id == payload.reading.deviceID) {
							_this15.addReading(payload.reading);
						}
						break;
				}
			});

			// Setup Chartist line graph
			new _chartist2.default.Line('#' + this.readingID(), {
				labels: this.readingLabels(),
				series: this.readingSeries()
			}, {
				fullWidth: true,
				lineSmooth: _chartist2.default.Interpolation.cardinal({
					fillHoles: true
				})
			});
		}
	}]);

	return Device;
})(_react2.default.Component);

var Settings = (function (_React$Component10) {
	_inherits(Settings, _React$Component10);

	function Settings() {
		var _Object$getPrototypeO8;

		var _temp8, _this16, _ret8;

		_classCallCheck(this, Settings);

		for (var _len8 = arguments.length, args = Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
			args[_key8] = arguments[_key8];
		}

		return _ret8 = (_temp8 = (_this16 = _possibleConstructorReturn(this, (_Object$getPrototypeO8 = Object.getPrototypeOf(Settings)).call.apply(_Object$getPrototypeO8, [this].concat(args))), _this16), _this16.state = {
			changingPassword: false,
			changingEmail: false
		}, _this16.changePassword = function (event) {
			event.preventDefault();

			var newPassword = _this16.refs.newPassword.value;
			var confirmNewPassword = _this16.refs.confirmNewPassword.value;
			if (newPassword !== confirmNewPassword) {
				toastr.error('New password doesn\'t match confirmation password', '', { timeOut: 3000 });
				return;
			}

			// this.setState({ changingPassword: true });

			// TODO: Implement Parse's Change Password
		}, _this16.changeEmail = function (event) {
			event.preventDefault();

			// this.setState({ changingEmail: true });

			// TODO: Implement Parse's Change Email
		}, _temp8), _possibleConstructorReturn(_this16, _ret8);
	}

	_createClass(Settings, [{
		key: 'render',
		value: function render() {
			return _react2.default.createElement(
				'div',
				{ className: 'flex column' },
				_react2.default.createElement(
					'div',
					{ className: 'flex row' },
					_react2.default.createElement(
						'form',
						{ className: 'flex column', action: '#' },
						_react2.default.createElement(
							'div',
							{ className: 'flex row align-center justify-center' },
							_react2.default.createElement(
								'h3',
								null,
								'Change Email'
							)
						),
						_react2.default.createElement(
							'div',
							{ className: 'flex row' },
							_react2.default.createElement(
								'div',
								{ className: 'flex column one' },
								_react2.default.createElement('input', { ref: 'oldEmail', id: 'old-email', type: 'email', className: 'validate' }),
								_react2.default.createElement(
									'label',
									{ htmlFor: 'old-email' },
									'Old Email'
								)
							),
							_react2.default.createElement(
								'div',
								{ className: 'flex column one' },
								_react2.default.createElement('input', { ref: 'newEmail', id: 'new-email', type: 'email', className: 'validate' }),
								_react2.default.createElement(
									'label',
									{ htmlFor: 'new-email' },
									'New Email'
								)
							),
							_react2.default.createElement(
								'div',
								{ className: 'flex column one' },
								_react2.default.createElement('input', { ref: 'password', id: 'password', type: 'password', className: 'validate' }),
								_react2.default.createElement(
									'label',
									{ htmlFor: 'password' },
									'Password'
								)
							),
							_react2.default.createElement(
								'button',
								{ onClick: this.changeEmail },
								this.state.changingEmail ? 'Submitting..' : 'Submit'
							)
						)
					)
				),
				_react2.default.createElement(
					'div',
					{ className: 'flex row' },
					_react2.default.createElement(
						'form',
						{ className: 'flex column one', action: '#' },
						_react2.default.createElement(
							'div',
							{ className: 'flex row align-center justify-center' },
							_react2.default.createElement(
								'h3',
								null,
								'Change Password'
							)
						),
						_react2.default.createElement(
							'div',
							{ className: 'flex row' },
							_react2.default.createElement(
								'div',
								{ className: 'flex column one' },
								_react2.default.createElement('input', { ref: 'email', id: 'email', type: 'email', className: 'validate' }),
								_react2.default.createElement(
									'label',
									{ htmlFor: 'email' },
									'Email'
								)
							),
							_react2.default.createElement(
								'div',
								{ className: 'flex column one' },
								_react2.default.createElement('input', { ref: 'oldPassword', id: 'old-password', type: 'password', className: 'validate' }),
								_react2.default.createElement(
									'label',
									{ htmlFor: 'old-password' },
									'Old Password'
								)
							),
							_react2.default.createElement(
								'div',
								{ className: 'flex column one' },
								_react2.default.createElement('input', { ref: 'newPassword', id: 'new-password', type: 'password', className: 'validate' }),
								_react2.default.createElement(
									'label',
									{ htmlFor: 'new-password' },
									'New Password'
								)
							),
							_react2.default.createElement(
								'div',
								{ className: 'flex column one' },
								_react2.default.createElement('input', { ref: 'confirmNewPassword', id: 'confirm-new-password', type: 'password', className: 'validate' }),
								_react2.default.createElement(
									'label',
									{ htmlFor: 'confirm-new-password' },
									'Confirm New Password'
								)
							),
							_react2.default.createElement(
								'button',
								{ onClick: this.changePassword },
								this.state.changingPassword ? 'Submitting..' : 'Submit'
							)
						)
					)
				)
			);
		}
	}]);

	return Settings;
})(_react2.default.Component);

var Navbar = (function (_React$Component11) {
	_inherits(Navbar, _React$Component11);

	function Navbar() {
		var _Object$getPrototypeO9;

		var _temp9, _this17, _ret9;

		_classCallCheck(this, Navbar);

		for (var _len9 = arguments.length, args = Array(_len9), _key9 = 0; _key9 < _len9; _key9++) {
			args[_key9] = arguments[_key9];
		}

		return _ret9 = (_temp9 = (_this17 = _possibleConstructorReturn(this, (_Object$getPrototypeO9 = Object.getPrototypeOf(Navbar)).call.apply(_Object$getPrototypeO9, [this].concat(args))), _this17), _this17.logout = function (event) {
			_parse2.default.User.logOut().then(function () {
				dispatcher.dispatch({ type: 'reloadCurrentUser' });
			});
		}, _temp9), _possibleConstructorReturn(_this17, _ret9);
	}

	_createClass(Navbar, [{
		key: 'render',
		value: function render() {
			return _react2.default.createElement(
				'nav',
				{ className: 'navbar' },
				_react2.default.createElement(
					'ul',
					{ className: 'menu' },
					_react2.default.createElement(
						'li',
						null,
						_react2.default.createElement(
							'a',
							{ href: '#', onClick: goto.bind(null, 'overview') },
							'Overview'
						)
					),
					_react2.default.createElement(
						'li',
						null,
						_react2.default.createElement(
							'a',
							{ href: '#', onClick: goto.bind(null, 'devices') },
							'Devices'
						)
					),
					_react2.default.createElement(
						'li',
						null,
						_react2.default.createElement(
							'a',
							{ href: '#', onClick: goto.bind(null, 'settings') },
							'Settings'
						)
					),
					_react2.default.createElement(
						'li',
						null,
						_react2.default.createElement(
							'a',
							{ href: '#', onClick: this.logout },
							'Log Out'
						)
					)
				)
			);
		}
	}]);

	return Navbar;
})(_react2.default.Component);

_reactDom2.default.render(_react2.default.createElement(App, null), document.getElementById('root'));