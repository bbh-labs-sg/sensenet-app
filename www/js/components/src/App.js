// React
import React from 'react'
import ReactDOM from 'react-dom'

// Flux
import Flux from 'flux'
let dispatcher = new Flux.Dispatcher();

// Pusher
import Pusher from 'pusher-js'
let pusher = null,
    channel = null;

// Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiamFja3liIiwiYSI6ImI0NDE5NjdmMWYzMjM5YzQyMzUxNzkyOGUwMzgzZmNjIn0.7-uee1Olm9EI4cT04c6gQw';

// Sensor data buffer
let sensorDataBuffer;

const STATE_NOT_CONNECTED	= 0,
      STATE_LISTING_DEVICES = 1,
      STATE_CONNECTING		= 2,
      STATE_CONNECTED		= 3;

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

function indexOf(array, value, start = 0) {
	for (let i = start; i < array.length; i++) {
		if (array[i] === value) {
			return i;
		}
	}
	return -1;
}

class App extends React.Component {
	render() {
		return (
			<div id='app' className='flex column one'>
				<Navbar />
				<Dashboard readings={ this.state.readings } connected={ this.state.deviceState == STATE_CONNECTED } />
				<DeviceManager ref='deviceManager' deviceID={ this.state.deviceID } deviceState={ this.state.deviceState } />
				<NetworkManager ref='networkManager' />
			</div>
		)
	}
	state = {
		readings: [ null, null, null, null, null, null, null, null, null, null ],
		deviceID: null,
		deviceState: STATE_NOT_CONNECTED,
	};
	componentDidMount() {
		this.listenerID = dispatcher.register((payload) => {
			switch (payload.type) {
			case 'reloadCurrentUser':
				this.reloadCurrentUser();
				break;
			case 'sensorReading':
				let readings = this.state.readings;
				readings.push(payload.reading);
				readings.shift();
				this.setState({ readings: readings });
				break;
			case 'deviceID':
				this.setState({ deviceID: payload.deviceID });
				break;
			case 'deviceState':
				this.setState({ deviceState: payload.deviceState });
				break;
			}
		});
	}
	componentWillUnmount() {
		dispatcher.unregister(this.listenerID);
	}
	onPause = () => {
		this.refs.deviceManager.onPause();
		this.refs.networkManager.onPause();
	};
	onResume = () => {
		this.refs.deviceManager.onResume();
		this.refs.networkManager.onResume();
	};
}

class DeviceManager extends React.Component {
	render() {
		return null;
	}
	componentDidMount() {
		this.listenerID = dispatcher.register((payload) => {
			switch (payload.type) {
			case 'connectDevice':
				this.connectDevice(); break;
			case 'disconnectDevice':
				this.disconnectDevice(); break;
			}
		});
	}
	componentWillUnmount() {
		dispatcher.unregister(this.listenerID);
	}
	onPause() {
	}
	onResume() {
	}
	connectDevice = () => {
		bluetoothSerial.isEnabled(this.onBluetoothEnabled, this.onBluetoothDisabled);
	};
	disconnectDevice = () => {
		bluetoothSerial.isConnected(
			() => {
				bluetoothSerial.disconnect(this.onBluetoothDisconnectSucceeded, this.onBluetoothDisconnectFailed);
			},
			() => { }
		);
	};
	initiateSendSensorReading = (data) => {
		dispatcher.dispatch({
			type: 'sendSensorReading',
			data: data,
		});
	};
	onBluetoothEnabled = () => {
		let state = this.props.deviceState;
		if (state == STATE_NOT_CONNECTED) {
			bluetoothSerial.list(this.onBluetoothListSucceeded, this.onBluetoothListFailed);
			dispatcher.dispatch({ type: 'deviceState', deviceState: STATE_LISTING_DEVICES });
			toastr.info(
				'Looking for device..',
				'If you can\'t connect to the device, try pairing with it first.',
				{ timeOut: 2000 }
			);
		}
	};
	onBluetoothDisabled = () => {
		toastr.error(
			'Bluetooth is not enabled',
			'Please go to your phone settings and enable Bluetooth.',
			{ timeOut: 3000 }
		);
	};
	onBluetoothDisconnectSucceeded = () => {
		dispatcher.dispatch({ type: 'deviceState', deviceState: STATE_NOT_CONNECTED });
	};
	onBluetoothDisconnectFailed = () => {
		toastr.error('Failed to disconnect the device', '', { timeOut: 3000 });
	};
	onBluetoothListSucceeded = (devices) => {
		for (let i in devices) {
			if (devices[i].name == 'SenseNet') {
				dispatcher.dispatch({ type: 'deviceState', deviceState: STATE_CONNECTING });
				bluetoothSerial.connect(devices[i].address, this.onBluetoothConnectSucceeded, this.onBluetoothConnectFailed);
				return;
			}
		}

		this.onBluetoothConnectFailed();
	};
	onBluetoothListFailed = () => {
		dispatcher.dispatch({ type: 'deviceState', deviceState: STATE_NOT_CONNECTED });
		toastr.error('Couldn\'t find a SenseNet device', '', { timeOut: 3000 });
	};
	onBluetoothConnectSucceeded = () => {
		dispatcher.dispatch({ type: 'deviceState', deviceState: STATE_CONNECTED });
		bluetoothSerial.subscribeRawData(this.onBluetoothDataSucceeded, this.onBluetoothDataFailed);
		toastr.success('Connected to a SenseNet device!', '', { timeOut: 3000 });
	};
	onBluetoothConnectFailed = () => {
		dispatcher.dispatch({ type: 'deviceState', deviceState: STATE_NOT_CONNECTED });
		toastr.error('Connection Failed!', 'Couldn\'t connect to the SenseNet device!', { timeOut: 3000 });
	};
	onBluetoothDataSucceeded = (rawData) => {
		if (sensorDataBuffer) {
			let newSensorDataBuffer = new ArrayBuffer(sensorDataBuffer.byteLength + rawData.byteLength);
			let src1 = new Uint8Array(sensorDataBuffer);
			let src2 = new Uint8Array(rawData);
			let dst = new Uint8Array(newSensorDataBuffer);
			for (let i = 0; i < src1.length; i++) {
				dst[i] = src1[i];
			}
			for (let i = 0; i < src2.length; i++) {
				dst[i + src1.length] = src2[i];
			}
			sensorDataBuffer = newSensorDataBuffer;
		} else {
			sensorDataBuffer = rawData;
		}

		let indexArray = new Uint16Array(sensorDataBuffer);
		let start = 0;
		let end = indexOf(indexArray, 0x0A0D, start);
		let reading;

		// Have to multiply by two to convert int16 index to int8 index
		while ((end - start) * 2 >= 28) {
			let workBuffer = sensorDataBuffer.slice(start * 2, end * 2);
			reading = this.parseData(workBuffer);

			start = end + 1;
			end = indexOf(indexArray, 0x0A0D, start);
		}

		if (reading) {
			this.sendData(reading);
		}

		let leftoverStart = end >= 0 ? end * 2 : start * 2;
		let leftoverEnd = indexArray.length * 2;
		if (leftoverStart >= 0) {
			let leftoverBuffer = sensorDataBuffer.slice(leftoverStart, leftoverEnd);
			let newSensorDataBuffer = new ArrayBuffer(leftoverEnd - leftoverStart);
			let src = new Uint8Array(leftoverBuffer);
			let dst = new Uint8Array(newSensorDataBuffer);
			for (let i = 0; i < leftoverBuffer.byteLength; i++) {
				dst[i] = src[i];
			}
			sensorDataBuffer = newSensorDataBuffer;
		} else {
			sensorDataBuffer = null;
		}
	};
	onBluetoothDataFailed = () => {
		toastr.error('Bluetooth', 'Failed to get data from the device.', { timeOut: 3000 });
	};
	onGetCurrentPositionSucceeded = (position) => {
		this.data.deviceID = this.props.deviceID;
		this.data.coordinates = position.coords;
		this.initiateSendSensorReading(this.data);
	};
	onGetCurrentPositionError = (error) => {
		toastr.error('GPS Failed', 'Try going outdoors to get better GPS signal.', { timeOut: 1000 });
	};
	parseData = (buffer) => {
		// Device ID
		let deviceID = String.fromCharCode.apply(null, new Uint8Array(buffer, 0, 10));

		// Float values
		// ------------
		// values[0] => Temperature
		// values[1] => Humidity
		// values[2] => UV
		// values[3] => Particles
		let values = new Float32Array(buffer.slice(10, 26));

		// Carbon Monoxide		
		let carbonMonoxide = new Int16Array(buffer, 26, 1);

		return {
			deviceID: deviceID,
			temperature: values[0],
			humidity: values[1],
			uv: values[2],
			particles: values[3],
			carbonMonoxide: carbonMonoxide,
		};
	};
	sendData(reading) {
		dispatcher.dispatch({
			type: 'sensorReading',
			reading: {
				deviceID: reading.deviceID,
				temperature: reading.temperature,
				humidity: reading.humidity,
				uv: reading.uv,
				particles: reading.particles,
				carbonMonoxide: reading.carbonMonoxide,
			},
		});
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
				this.initiateSendSensorReading(payload.data); break;
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
	};
	onResume = () => {
	};
	initiateSendSensorReading = (data) => {
		// For real-time viewers
		//this.sendSensorReadingRealtime(data);

		// For permanent storage
		//this.sendSensorReading(data);
	};
	sendSensorReading(data) {
		if (!data)
			return;

		$.ajax({
			url: 'https://sensenet.bbh-labs.com.sg/reading',
			method: 'POST',
			data: data,
		});
	}
	sendSensorReadingRealtime(data) {
		if (!data)
			return;

		channel.trigger('client-reading', {
			deviceID: deviceID,
			data: data,
			coordinates: coordinates,
		});
	}
	postDummyData = () => {
		let coordinates = {
			latitude: 1.25 + Math.random() * 0.15,
			longitude: 103.65 + Math.random() * 0.3,
		};

		let data = {
			deviceID: '71GM9xi757',
			temperature: 28 + Math.random() * 10,
			humidity: Math.random() * 100,
			uv: Math.random() * 15,
			carbonMonoxide: Math.random() * 1024,
			particles: Math.random() * 1024,
			coordinates: coordinates,
		};

		this.initiateSendSensorReading(data);
	};
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

class Dashboard extends React.Component {
	render() {
		let page = null;

		switch (this.state.page) {
		case 'overview':
			page = <Overview />; break;
		case 'my-device':
			page = <MyDevice connected={ this.props.connected } readings={ this.props.readings } />; break;
		}

		return page;
	}
	state = {
		page: 'my-device',
	};
	componentDidMount() {
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

class MyDevice extends React.Component {
	render() {
		let connected = this.props.connected;
		return (
			<div className='flex one column sensenode z-depth-2'>
				<h5>My Device</h5>
				<canvas ref='canvas' />
				{
					connected ?
					<button onClick={this.disconnectDevice}>Disconnect Device</button> :
					<button onClick={this.connectDevice}>Connect Device</button>
				}
			</div>
		)
	}
	componentDidMount() {
		this.updateCanvas();
	}
	componentDidUpdate() {
		this.updateCanvas();
	}
	connectDevice() {
		dispatcher.dispatch({ type: 'connectDevice' });
	}
	disconnectDevice() {
		dispatcher.dispatch({ type: 'disconnectDevice' });
	}
	updateCanvas = () => {
		let canvas = this.refs.canvas;
		let context = canvas.getContext('2d');
		let width = canvas.width = canvas.offsetWidth;
		let height = canvas.height = canvas.offsetHeight;

		context.fillStyle = 'black';
		context.fillRect(0, 0, canvas.width, canvas.height);

		let readings = this.props.readings;
		let cellWidth = width / readings.length;
		let cellHeight = height / readings.length;

		for (let i in readings) {
			let cellX = cellWidth * i;
		}
	};
}

class Navbar extends React.Component {
	render() {
		return (
			<nav className='navbar'>
				<ul className='navbar-menu flex row'>
					<li className='flex navbar-menu-item'><a href='#' onClick={goto.bind(null, 'overview')}>Overview</a></li>
					<li className='flex navbar-menu-item'><a href='#' onClick={goto.bind(null, 'my-device')}>My Device</a></li>
				</ul>
			</nav>
		)
	}
}

ReactDOM.render(<App />, document.getElementById('root'));
