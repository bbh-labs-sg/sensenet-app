// React
import React from 'react'
import ReactDOM from 'react-dom'

// Classnames
import cx from 'classnames'

// Flux
import Flux from 'flux'
let dispatcher = new Flux.Dispatcher();

// Pusher
import Pusher from 'pusher-js'
let pusher = null,
    channel = null;

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

function map(value, min1, max1, min2, max2) {
	return (value - min1) / (max1 - min1) * (max2 - min2) - min2;
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
		let connected = this.state.deviceState == STATE_CONNECTED;
		return (
			<div id='app' className='flex column one'>
				<Dashboard reading={ this.state.reading } connected={ connected } />
				<DeviceManager ref='deviceManager' deviceID={ this.state.deviceID } deviceState={ this.state.deviceState } />
				<NetworkManager ref='networkManager' />
			</div>
		)
	}
	state = {
		reading: null,
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
				this.setState({ reading: payload.reading });
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
		toastr.success('Successfully disconnected from the device', '', { timeOut: 1000 });
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
			carbonMonoxide: carbonMonoxide[0],
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
		case 'my-device':
			page = <MyDevice connected={ this.props.connected } reading={ this.props.reading } />; break;
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

class MyDevice extends React.Component {
	render() {
		let connected = this.props.connected;
		return (
			<div className='my-device flex one column'>
				{ connected ? <Connected reading={ this.props.reading } /> : <Disconnected /> }
			</div>
		)
	}
	connectDevice() {
		dispatcher.dispatch({ type: 'connectDevice' });
	}
	disconnectDevice() {
		dispatcher.dispatch({ type: 'disconnectDevice' });
	}
}

class Connected extends React.Component {
	render() {
		let reading = this.props.reading;
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
			let temperaturePct = map(reading.temperature, 25, 34, 0, 100);
			let humidityPct = reading.humidity;
			let carbonMonoxidePct = map(reading.carbonMonoxide, 0, 1024, 0, 100);
			let uvPct = map(reading.uv, 0, 15, 0, 100);
			let particlesPct = map(reading.particles, 0, 2000, 0, 100);
			let quality = ((temperaturePct + humidityPct + carbonMonoxidePct + uvPct + particlesPct) * 0.2).toFixed();
			return (
				<div className='flex column one'>
					<div className='flex column one'>
						<div className='flex row one align-center justify-center'>
							<hr className='line flex one' /><p className='location-title'>LOCATION</p><hr className='line flex one' />
						</div>
						<div className='flex row one align-center justify-center'>
							<h3 className='location'>5 MAGAZINE ROAD</h3>
						</div>
					</div>
					<div className='flex column two align-center justify-center'>
						<div className={cx('air-quality-container flex column align-center justify-center', this.qualityColor(quality))}>
							<h3 className='air-quality-status'>{ this.airQualityStatus(quality) }</h3>
							<h1 className='air-quality-score'>{ quality }</h1>
						</div>
						<h3 className='air-quality-label'>AIR QUALITY</h3>
					</div>
					<div className='sensors flex column three justify-center'>
						<Sensor label='Temperature' percentage={temperaturePct} value={reading.temperature} />
						<Sensor label='Humidity' percentage={humidityPct} value={reading.humidity} />
						<Sensor label='Carbon Monoxide' percentage={carbonMonoxidePct} value={reading.carbonMonoxide} />
						<Sensor label='UV' percentage={uvPct} value={reading.uv} />
						<Sensor label='Particles' percentage={particlesPct} value={reading.particles} />
					</div>
					<div className='flex one align-center justify-center'>
						<button className='disconnect-button' onClick={this.disconnect}>DISCONNECT</button>
					</div>
				</div>
			)
		}
		return null;
	}
	airQualityStatus(quality) {
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
	qualityColor(quality) {
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
	disconnect() {
		dispatcher.dispatch({ type: 'disconnectDevice' });
	}
}

class Sensor extends React.Component {
	render() {
		return (
			<div className='sensor flex row'>
				<h3 className='sensor-label flex'>{ this.props.label }</h3>
				<div className='flex one'>
					<span className={cx('sensor-bar', this.barLabel())} style={{ width: this.props.percentage + '%' }} />
					<span className='sensor-value flex'>{ this.props.value.toFixed(1) }</span>
				</div>
			</div>
		)
	}
	barLabel = () => {
		let percentage = this.props.percentage;
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
	};
}

class Disconnected extends React.Component {
	render() {
		return (
			<div className='disconnected flex column one'>
				<div className='flex column one align-center justify-center'>
					<img className='sensenet-logo' src='images/sensenet.png' />
				</div>
				<div className='flex column one align-center justify-center'>
					<img className='device-image' src='images/device.png' />
					<p>Device</p>
				</div>
				<div className='flex column one align-center justify-center'>
					<button className='connect-button' onClick={this.connect}>CONNECT</button>
				</div>
			</div>
		)
	}
	connect() {
		dispatcher.dispatch({ type: 'connectDevice' });
	}
}

ReactDOM.render(<App />, document.getElementById('root'));
