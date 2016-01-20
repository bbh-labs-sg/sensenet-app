// Toggle between Cordova and Web
const CORDOVA = false;

// React
import React from 'react'
import ReactDOM from 'react-dom'

// Flux
import Flux from 'flux'
let dispatcher = new Flux.Dispatcher();

// Parse
import Parse from 'parse'
Parse.initialize(
	'9sMhGuNUapuBzG4HePZSNUmfRyDegxsXXoAjttUk', // Application ID
	'D9fEaIKZDPaB9mocOj1xv9OPusKGi1AAvKu2rPi2'  // JavaScript Key
);

// Pusher
import Pusher from 'pusher-js'
let pusher = null,
    channel = null;

// Chartist
import Chartist from 'chartist'

// Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiamFja3liIiwiYSI6ImI0NDE5NjdmMWYzMjM5YzQyMzUxNzkyOGUwMzgzZmNjIn0.7-uee1Olm9EI4cT04c6gQw';

const STATE_NOT_CONNECTED	= 0,
      STATE_LISTING_DEVICES = 1,
      STATE_CONNECTING		= 2,
      STATE_CONNECTED		= 3,
      STATE_NOT_FOUND		= 4;

const LOOK_FOR_DEVICE_INTERVAL = 5000;

function goto(page) {
	dispatcher.dispatch({
		type: 'goto',
		page: page,
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

class ReadingObject extends Parse.Object {
	constructor() {
		super('Reading');
	}
}

class App extends React.Component {
	render() {
		let user = this.state.user;
		return (
			<div id='app' className='flex column one'>
				{ user ? <Navbar /> : null }
				{ user ? <Dashboard /> : <Authentication /> }
				<DeviceManager ref='deviceManager' loggedIn={ !!user } />
				<NetworkManager ref='networkManager' loggedIn={ !!user } />
			</div>
		)
	}
	state = {
		user: null,
	}
	componentDidMount() {
		this.reloadCurrentUser();

		if (CORDOVA) {
			document.addEventListener('pause', this.onPause, false);
			document.addEventListener('resume', this.onResume, false);
			this.onResume();
		}

		this.listenerID = dispatcher.register((payload) => {
			switch (payload.type) {
			case 'reloadCurrentUser':
				this.reloadCurrentUser(); break;
			}
		});
	}
	onPause = () => {
		this.refs.deviceManager.onPause();
		this.refs.networkManager.onPause();
	}
	onResume = () => {
		this.refs.deviceManager.onResume();
		this.refs.networkManager.onResume();
	}
	reloadCurrentUser = () => {
		let currentUser = Parse.User.current();
		if (currentUser) {
			this.refs.networkManager.initPusher();
		} else {
			this.refs.networkManager.destroyPusher();
		}
		this.setState({ user: currentUser });
	}
}

class DeviceManager extends React.Component {
	render() {
		return null;
	}
	state = {
		deviceState: STATE_NOT_CONNECTED,
		deviceID: null,
	}
	onPause() {
		this.cancelLookForDevice();
		bluetoothSerial.disconnect();
	}
	onResume() {
		// Look for a device if logged in
		if (this.props.loggedIn) {
			this.startLookForDevice();
		}
	}
	lookForDevice = () => {
		let state = this.state.deviceState;
		if (state == STATE_NOT_CONNECTED || state == STATE_NOT_FOUND) {
			bluetoothSerial.list(this.onBluetoothListSuccess, this.onBluetoothListFailure);
			this.setState({ deviceState: STATE_LISTING_DEVICES });
			toastr.info('Looking for a SenseNet device..', '', { timeOut: 2000 });
		}
	}
	startLookForDevice = () => {
		if (!this.lookForDeviceIntervalID) {
			this.lookForDeviceIntervalID = setInterval(this.lookForDevice, 5000);
		}
	}
	cancelLookForDevice = () => {
		if (this.lookForDeviceIntervalID) {
			clearInterval(this.lookForDeviceIntervalID);
		}
		this.lookForDeviceIntervalID = null;
	}
	sendSensorReading = (deviceID, data, coordinate) => {
		dispatcher.dispatch({
			type: 'sendSensorReading',
			deviceID, deviceID,
			data: data,
			coordinate: coordinate,
		});
	}
	onBluetoothListSuccess = (devices) => {
		for (let i in devices) {
			if (devices[i].name == 'SenseNet') {
				this.setState({ deviceState: STATE_CONNECTING });
				bluetoothSerial.connect(devices[i].address, this.onBluetoothConnectSuccess, this.onBluetoothConnectFailure);
				return;
			}
		}
		this.setState({ deviceState: STATE_NOT_FOUND });
		toastr.error('Couldn\'t find a SenseNet device', '', { timeOut: 3000 });
	}
	onBluetoothListFailure = () => {
		this.setState({ deviceState: STATE_NOT_CONNECTED });
		setTimeout(this.lookForDevice, 5000);
	}
	onBluetoothConnectSuccess = () => {
		this.setState({ deviceState: STATE_CONNECTED });
		bluetoothSerial.subscribe('\r\n', this.onBluetoothDataSuccess, this.onBluetoothDataFailure);
		toastr.success('Connected to a SenseNet device!', '', { timeOut: 3000 });
	}
	onBluetoothConnectFailure = () => {
		this.setState({ deviceState: STATE_NOT_CONNECTED });
		toastr.error('Failed to connect the SenseNet device!', '', { timeOut: 3000 });
	}
	onBluetoothDataSuccess = (rawData) => {
		try {
			this.data = null;
			this.data = JSON.parse(rawData);
			navigator.geolocation.getCurrentPosition(
				this.onGetCurrentPositionSuccess,
				this.onGetCurrentPositionError,
				{ maximumAge: 3000, timeout: 5000, enableHighAccuracy: true }
			);
		} catch (error) {
			// do nothing
		}
	}
	onBluetoothDataFailure = () => {
		// do nothing
	}
	onGetCurrentPositionSuccess = (position) => {
		this.sendSensorReading(this.state.deviceID, this.data, position.coords);
	}
	onGetCurrentPositionError = (error) => {
		toastr.error('Failed to get GPS position', '', { timeOut: 1000 });
	}
}

class NetworkManager extends React.Component {
	render() {
		return null;
	}
	componentDidMount() {
		this.listenerID = dispatcher.register((payload) => {
			switch (payload) {
			case 'sendSensorReading':
				this.sendSensorReading(payload.deviceID, payload.data, payload.coordinate); break;
			}
		});

		//if (this.props.loggedIn) {
		//	for (let i = 0; i < 100; i++) {
		//		this.postDummyData();
		//	}
		//}
	}
	componentDidUpdate() {
		//if (this.props.loggedIn) {
		//	for (let i = 0; i < 100; i++) {
		//		this.postDummyData();
		//	}
		//}
	}
	componentWillUnmount() {
		dispatcher.unregister(this.listenerID);
	}
	onPause = () => {
	}
	onResume = () => {
	}
	sendSensorReading = (deviceID, data, coordinate) => {
		if (!(!!deviceID && !!data && !!coordinate)) {
			return;
		}

		// For real-time viewers
		this.sendSensorReadingRealtime(deviceID, data, coordinate);

		// Save sensor reading to database
		let device = Parse.Object.extend('Device');
		let query = new Parse.Query(device);
		query.get(deviceID, {
			success: (device) => {
				let reading = new ReadingObject();
				reading.set('data', data);
				reading.set('coordinate', new Parse.GeoPoint(coordinate));
				reading.set('device', device);
				reading.save(null, {
					success: (reading) => {
						// do nothing
					},
					error: (reading, error) => {
						toastr.error('Failed to upload sensor readings.', '', { timeOut: 1000 });
					},
				});
			},
			error: (device, error) => {
				// do nothing
			},
		});
	}
	sendSensorReadingRealtime(deviceID, data, coordinate) {
		channel.trigger('client-reading', {
			deviceID: deviceID,
			data: data,
			coordinate: coordinate,
		});
	}
	postDummyData = () => {
		let position = {
			coords: {
				latitude: 1.25 + Math.random() * 0.15,
				longitude: 103.65 + Math.random() * 0.3,
			},
		};

		let data = {
			temperature: 28 + Math.random() * 10,
			humidity: Math.random() * 100,
			uv: Math.random() * 15,
			carbonMonoxide: Math.random() * 1024,
			particles: Math.random() * 1024,
		};

		this.sendSensorReading('71GM9xi757', data, position.coords);
	}
	initPusher() {
		pusher = new Pusher('ae0834efadeb12c41af8', {
			authEndpoint: 'https://sensenet.bbh-labs.com.sg/pusher/auth',
			encrypted: true,
		});

		channel = pusher.subscribe('private-client-reading');
		channel.bind('pusher:subscription_error', function(status) {
			console.log('error:', status);
		});
		channel.bind('client-reading', function(reading) {
			dispatcher.dispatch({
				type: 'reading',
				reading: reading,
			});
		});
	}
	destroyPusher() {
		if (pusher) {
			pusher = null;
		}

		if (channel) {
			channel.unsubscribe('private-client-reading');
			channel.unbind('pusher:subscription_error');
			channel.unbind('client-reading');
		}
	}
}

class Authentication extends React.Component {
	render() {
		return (
			<div className='authentication flex column'>
				<form className='flex column one' action='#'>
					<div className='flex row align-center justify-center'>
						<h3>SenseNet</h3>
					</div>
					<div className='flex column align-center justify-center'>
						<div className='flex column one'>
							<label htmlFor='email'>Email</label>
							<input ref='email' id='email' type='email' />
						</div>
						<div className='flex column one'>
							<label htmlFor='password'>Password</label>
							<input ref='password' id='password' type='password' />
						</div>
					</div>
					<div className='flex row align-center justify-center'>
						<button onClick={this.login}>
							{ this.state.loggingIn ? 'Logging In..' : 'Log In' }
						</button>
						<button onClick={this.signup}>
							{ this.state.signingUp ? 'Signing Up..' : 'Sign Up' }
						</button>
						<button onClick={this.resetPassword}>
							{ this.state.resettingPassword ? 'Resetting Password..' : 'Reset Password' }
						</button>
					</div>
				</form>
			</div>
		)
	}
	state = {
		loggingIn: false,
		signingUp: false,
		resettingPassword: false,
	}
	componentDidMount() {
		dispatcher.dispatch({ type: 'reloadCurrentUser' });
	}
	login = (event) => {
		event.preventDefault();

		this.setState({ loggingIn: true });

		Parse.User.logIn(this.refs.email.value, this.refs.password.value, {
			success: (user) => {
				dispatcher.dispatch({ type: 'reloadCurrentUser' });
				this.setState({ loggingIn: false });
			},
			error: (user, error) => {
				dispatcher.dispatch({ type: 'reloadCurrentUser' });
				this.setState({ loggingIn: false });
			},
		});
	}
	signup = (event) => {
		event.preventDefault();

		this.setState({ signingUp: true });

		let user = new Parse.User();
		user.set('username', this.refs.email.value);
		user.set('email', this.refs.email.value);
		user.set('password', this.refs.password.value);
		user.signUp(null, {
			success: (user) => {
				dispatcher.dispatch({ type: 'reloadCurrentUser' });
				this.setState({ signingUp: false });
				toastr.success('Successfully registered!');
			},
			error: (user, error) => {
				dispatcher.dispatch({ type: 'reloadCurrentUser' });
				this.setState({ signingUp: false });
				toastr.error('Error: ' + error.code + ' ' + error.message);
			},
		});
	}
	resetPassword = (event) => {
		event.preventDefault();

		this.setState({ resettingPassword: true });

		Parse.User.requestPasswordReset(this.refs.email.value, {
			success: () => {
				this.setState({ resettingPassword: false });
				toastr.success('Sent reset password link to your email address!');
			},
			error: (error) => {
				this.setState({ resettingPassword: false });
				toastr.error('Error: ' + error.code + ' ' + error.message);
			}
		});
	}
}

class Dashboard extends React.Component {
	state = {
		page: 'overview',
		devices: null,
	}
	render() {
		let page = null;

		switch (this.state.page) {
		case 'overview':
			page = <Overview />; break;
		case 'devices':
			page = <Devices devices={ this.state.devices } />; break;
		case 'settings':
			page = <Settings />; break;
		}

		return page;
	}
	componentDidMount() {
		let device = Parse.Object.extend('Device');
		let query = new Parse.Query(device);
		query.find({
			success: (results) => {
				this.setState({ devices: results });
			},
			error: (error) => {
				toastr.error('Failed to load devices!', '', { timeOut: 1000 });
			},
		});

		this.listenerID = dispatcher.register((payload) => {
			switch (payload.type) {
			case 'goto':
				this.setState({ page: payload.page }); break;
			}
		});
	}
	componentWillUnmount() {
		dispatcher.unregister(this.listenerID);
	}
}

class Overview extends React.Component {
	render() {
		return (
			<div id='map' className='flex column one'>
			</div>
		)
	}
	componentDidMount() {
		this.drawMap();
	}
	componentWillUnmount() {
		window.map.remove();
		window.map = null;
	}
	drawMap(geojson) {
		let map = new mapboxgl.Map({
			container: 'map',
			style: 'mapbox://styles/jackyb/cijmshu7s00mdbolxqpd5f5pz',
			center: [ 103.83888, 1.29094 ],
			zoom: 13,
		});

		window.map = map;
	}
}

class Devices extends React.Component {
	render() {
		let devices = this.props.devices;
		let myDevice = this.props.myDevice;
		return (
			<div className='flex one column'>
			{ !!myDevice ? <MyDevice device={ myDevice } /> : null }
			{
				!!devices ? devices.map((device, i) => {
					return <Device key={ device.id } device={ device } />
				}) : null
			}
			</div>
		)
	}
}

class MyDevice extends React.Component {
	render() {
		let device = this.props.myDevice;
		let readings = this.state.readings;
		return (
			<div className='flex one column sensenode z-depth-2'>
				<h5>My SenseNode</h5>
				<div className='ct-chart ct-golden-section' id='my-device'>
				</div>
			</div>
		)
	}
	state = {
		readings: [ null,null,null,null,null,null,null,null,null,null ],
	}
	componentDidMount() {
		let device = this.props.device;

		this.listenerID = dispatcher.register((payload) => {
			switch (payload.type) {
			case 'sendSensorReading':
				this.addReading(payload);
				break;
			}
		});

		// Setup Chartist line graph
		new Chartist.Line('#my-device', {
			labels: this.readingLabels(),
			series: this.readingSeries(),
		}, {
			fullWidth: true,
			lineSmooth: Chartist.Interpolation.cardinal({
				fillHoles: true,
			}),
		});
	}
	addReading = (reading) => {
		// Put new reading into the stack
		let readings = this.state.readings;
		readings.push(reading);
		readings.shift();
		this.setState({ readings: readings });

		// Update Chartist line graph
		new Chartist.Line('#my-device', {
			labels: this.readingLabels(),
			series: this.readingSeries(),
		}, {
			fullWidth: true,
			lineSmooth: Chartist.Interpolation.cardinal({
				fillHoles: true,
			}),
		});
	}
	readingLabels = () => {
		return this.state.readings.map(function(r, i) {
			return i;
		});
	}
	readingSeries = () => {
		let readings = this.state.readings;
		let series = [];
		let isValid = function(r, property) {
			return !!r && typeof(r) == 'object' &&
					 r.hasOwnProperty('data') &&
					 r.data.hasOwnProperty(property);
		};

		series.push(readings.map(function(r) {
			return isValid(r) ? r.data.temperature : 0;
		}));
		series.push(readings.map(function(r) {
			return isValid(r) ? r.data.humidity : 0;
		}));
		series.push(readings.map(function(r) {
			return isValid(r) ? r.data.carbonMonoxide * 0.1 : 0;
		}));
		series.push(readings.map(function(r) {
			return isValid(r) ? r.data.uv * 0.1 : 0;
		}));
		series.push(readings.map(function(r) {
			return isValid(r) ? r.data.particles * 0.1 : 0;
		}));

		return series;
	}
}

class Device extends React.Component {
	render() {
		let device = this.props.device;
		let readings = this.state.readings;
		return (
			<div className='flex one column sensenode z-depth-2'>
				<h5>SenseNode</h5>
				<div className='ct-chart ct-golden-section' id={ this.readingID() }>
				</div>
			</div>
		)
	}
	state = {
		readings: [ null,null,null,null,null,null,null,null,null,null ]
	}
	componentDidMount() {
		let device = this.props.device;

		this.listenerID = dispatcher.register((payload) => {
			switch (payload.type) {
			case 'reading':
				if (device.id == payload.reading.deviceID) {
					this.addReading(payload.reading);
				}
				break;
			}
		});

		// Setup Chartist line graph
		new Chartist.Line('#' + this.readingID(), {
			labels: this.readingLabels(),
			series: this.readingSeries(),
		}, {
			fullWidth: true,
			lineSmooth: Chartist.Interpolation.cardinal({
				fillHoles: true,
			}),
		});
	}
	addReading = (reading) => {
		// Put new reading into the stack
		let readings = this.state.readings;
		readings.push(reading);
		readings.shift();
		this.setState({ readings: readings });

		// Update Chartist line graph
		new Chartist.Line('#' + this.readingID(), {
			labels: this.readingLabels(),
			series: this.readingSeries(),
		}, {
			fullWidth: true,
			lineSmooth: Chartist.Interpolation.cardinal({
				fillHoles: true,
			}),
		});
	}
	readingID = () => {
		return 'reading-' + this.props.device.id;
	}
	readingLabels = () => {
		return this.state.readings.map(function(r, i) {
			return i;
		});
	}
	readingSeries = () => {
		let readings = this.state.readings;
		let series = [];
		let isValid = function(r, property) {
			return !!r && typeof(r) == 'object' &&
					 r.hasOwnProperty('data') &&
					 r.data.hasOwnProperty(property);
		};

		series.push(readings.map(function(r) {
			return isValid(r, 'temperature') ? r.data.temperature : 0;
		}));
		series.push(readings.map(function(r) {
			return isValid(r, 'humidity') ? r.data.humidity : 0;
		}));
		series.push(readings.map(function(r) {
			return isValid(r, 'carbonMonoxide') ? r.data.carbonMonoxide * 0.1 : 0;
		}));
		series.push(readings.map(function(r) {
			return isValid(r, 'uv') ? r.data.uv * 0.1 : 0;
		}));
		series.push(readings.map(function(r) {
			return isValid(r, 'particles') ? r.data.particles * 0.1 : 0;
		}));

		return series;
	}
}

class Settings extends React.Component {
	render() {
		return (
			<div className='settings flex column align-center'>
				<form className='change-email flex column one' action='#'>
					<div className='flex row align-center justify-center'>
						<h3>Change Email</h3>
					</div>
					<div className='flex column'>
						<div className='flex column'>
							<label htmlFor='old-email'>Old Email</label>
							<input ref='oldEmail' id='old-email' type='email' className='validate' />
						</div>
						<div className='flex column'>
							<label htmlFor='new-email'>New Email</label>
							<input ref='newEmail' id='new-email' type='email' className='validate' />
						</div>
						<div className='flex column'>
							<label htmlFor='password'>Password</label>
							<input ref='password' id='password' type='password' className='validate' />
						</div>
						<button onClick={this.changeEmail}>
							{ this.state.changingEmail ? 'Submitting..' : 'Submit' }
						</button>
					</div>
				</form>
				<form className='change-password flex column one' action='#'>
					<div className='flex row align-center justify-center'>
						<h3>Change Password</h3>
					</div>
					<div className='flex column'>
						<div className='flex column'>
							<label htmlFor='email'>Email</label>
							<input ref='email' id='email' type='email' className='validate' />
						</div>
						<div className='flex column'>
							<label htmlFor='old-password'>Old Password</label>
							<input ref='oldPassword' id='old-password' type='password' className='validate' />
						</div>
						<div className='flex column'>
							<label htmlFor='new-password'>New Password</label>
							<input ref='newPassword' id='new-password' type='password' className='validate' />
						</div>
						<div className='flex column'>
							<label htmlFor='confirm-new-password'>Confirm New Password</label>
							<input ref='confirmNewPassword' id='confirm-new-password' type='password' className='validate' />
						</div>
						<button onClick={this.changePassword}>
							{ this.state.changingPassword ? 'Submitting..' : 'Submit' }
						</button>
					</div>
				</form>
			</div>
		)
	}
	state = {
		changingPassword: false,
		changingEmail: false,
	}
	changePassword = (event) => {
		event.preventDefault();

		let newPassword = this.refs.newPassword.value;
		let confirmNewPassword = this.refs.confirmNewPassword.value;
		if (newPassword !== confirmNewPassword) {
			toastr.error('New password doesn\'t match confirmation password', '', { timeOut: 3000 });
			return;
		}

		// this.setState({ changingPassword: true });

		// TODO: Implement Parse's Change Password
	}
	changeEmail = (event) => {
		event.preventDefault();

		// this.setState({ changingEmail: true });

		// TODO: Implement Parse's Change Email
	}
}

class Navbar extends React.Component {
	render() {
		return (
			<nav className='navbar'>
				<ul className='navbar-menu flex row'>
					<li className='flex navbar-menu-item'><a href='#' onClick={goto.bind(null, 'overview')}>Overview</a></li>
					<li className='flex navbar-menu-item'><a href='#' onClick={goto.bind(null, 'devices')}>Devices</a></li>
					<li className='flex navbar-menu-item'><a href='#' onClick={goto.bind(null, 'settings')}>Settings</a></li>
					<li className='flex navbar-menu-item'><a href='#' onClick={this.logout}>Log Out</a></li>
				</ul>
			</nav>
		)
	}
	logout = (event) => {
		Parse.User.logOut().then(() => {
			dispatcher.dispatch({ type: 'reloadCurrentUser' });
		});
	}

}

ReactDOM.render(<App />, document.getElementById('root'));
