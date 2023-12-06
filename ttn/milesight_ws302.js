// Milesight WS302 Sound Level Sensor

function decodeUplink(input) {
  var bytes = input['bytes'];

  var bytesString = bytes2HexString(bytes).toLocaleUpperCase();

  var decoded = {
    // valid
    valid: true,
    err: 0,
    // bytes
    payload: bytesString,
    // messages array
    messages: [],
    // measurements
    measurements: {},
  };

  for (var i = 0; i < bytes.length;) {
    var channel_id = bytes[i++];
    var channel_type = bytes[i++];

    // BATTERY
    if (channel_id === 0x01 && channel_type === 0x75) {
      decoded.measurements.battery_percentage = bytes[i];

      decoded.messages.push({
        type: 'report_telemetry',
        measurementId: String(0x0175),
        measurementValue: String(decoded.measurements.battery_percentage),
        measurementResolution: '0.1',
        measurementUnit: '%',
        measurementDescription: 'Battery Percentage',
      });

      i += 1;
    }
    // SOUND
    else if (channel_id === 0x05 && channel_type === 0x5b) {
      decoded.measurements.frequency_weighting = readFrequencyWeightType(bytes[i]);
      decoded.measurements.time_weighting = readTimeWeightType(bytes[i]);
      decoded.measurements.spl_actual = readUInt16LE(bytes.slice(i + 1, i + 3)) / 10;
      decoded.measurements.spl_average = readUInt16LE(bytes.slice(i + 3, i + 5)) / 10;
      decoded.measurements.spl_maximum = readUInt16LE(bytes.slice(i + 5, i + 7)) / 10;

      decoded.messages.push({
        type: 'report_telemetry',
        measurementId: String(0x055b),
        measurementValue: String(decoded.measurements.frequency_weighting),
        measurementResolution: '-1',
        measurementUnit: 'Value',
        measurementDescription: 'Frequency Weighting',
      });

      decoded.messages.push({
        type: 'report_telemetry',
        measurementId: String(0x055b),
        measurementValue: String(decoded.measurements.fast_time_weighting),
        measurementResolution: '-1',
        measurementUnit: 'Value',
        measurementDescription: 'Time Weighting',
      });

      decoded.messages.push({
        type: 'report_telemetry',
        measurementId: String(0x055b),
        measurementValue: String(decoded.measurements.spl_actual),
        measurementResolution: '-1',
        measurementUnit: 'dBA',
        measurementDescription: 'Sound Pressure Level, Actual',
      });

      decoded.messages.push({
        type: 'report_telemetry',
        measurementId: String(0x055b),
        measurementValue: String(decoded.measurements.spl_average),
        measurementResolution: '-1',
        measurementUnit: 'dBA',
        measurementDescription: 'Sound Pressure Level, Average',
      });

      decoded.messages.push({
        type: 'report_telemetry',
        measurementId: String(0x055b),
        measurementValue: String(decoded.measurements.spl_maximum),
        measurementResolution: '-1',
        measurementUnit: 'dBA',
        measurementDescription: 'Sound Pressure Level, Maximum',
      });

      i += 7;
    }
    // LoRaWAN Class Type
    else if (channel_id === 0xff && channel_type === 0x0f) {
      switch (bytes[i]) {
        case 0:
          decoded.class_type = "class-a";
          break;
        case 1:
          decoded.class_type = "class-b";
          break;
        case 2:
          decoded.class_type = "class-c";
          break;
      }
      i += 1;
    } else {
      decoded.valid = false;
      decoded.err = -1; // unknown/unmatched channel id/type
      break;
    }
  }

  return {
    data: decoded,
  };
}

function readFrequencyWeightType(bytes) {
  var type = "";

  var bits = bytes & 0x03;
  switch (bits) {
    case 0:
      type = "Z";
      break;
    case 1:
      type = "A";
      break;
    case 2:
      type = "C";
      break;
  }

  return type;
}

function readTimeWeightType(bytes) {
  var type = "";

  var bits = (bytes[0] >> 2) & 0x03;
  switch (bits) {
    case 0:
      type = "impulse";
      break;
    case 1:
      type = "fast";
      break;
    case 2:
      type = "slow";
      break;
  }

  return type;
}

// util
function readUInt16LE(bytes) {
  var value = (bytes[1] << 8) + bytes[0];
  return value & 0xffff;
}

function readInt16LE(bytes) {
  var ref = readUInt16LE(bytes);
  return ref > 0x7fff ? ref - 0x10000 : ref;
}

function crc16Check(data) {
  return true;
}

function bytes2HexString(arrBytes) {
  var str = '';
  for (var i = 0; i < arrBytes.length; i++) {
    var tmp;
    var num = arrBytes[i];
    if (num < 0) {
      tmp = (255 + num + 1).toString(16);
    } else {
      tmp = num.toString(16);
    }
    if (tmp.length === 1) {
      tmp = '0' + tmp;
    }
    str += tmp;
  }
  return str;
}

// EOF
