// SenseCAP S21xx Sensors

function decodeUplink(input) {
  var bytes = input['bytes'];
  // init
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

  // CRC check
  if (!crc16Check(bytesString)) {
    decoded['valid'] = false;
    decoded['err'] = -1; // "crc check fail."
    return {
      data: decoded
    };
  }

  // Length Check
  if ((bytesString.length / 2 - 2) % 7 !== 0) {
    decoded['valid'] = false;
    decoded['err'] = -2; // "length check fail."
    return {
      data: decoded
    };
  }

  // Cache sensor id
  var sensorEuiLowBytes;
  var sensorEuiHighBytes;

  // Handle each frame
  var frameArray = divideBy7Bytes(bytesString);
  for (var forFrame = 0; forFrame < frameArray.length; forFrame++) {
    var frame = frameArray[forFrame];
    // Extract key parameters
    var channel = strTo10SysNub(frame.substring(0, 2));
    var dataID = strTo10SysNub(frame.substring(2, 6));
    var dataValue = frame.substring(6, 14);
    var realDataValue = isSpecialDataId(dataID) ? ttnDataSpecialFormat(dataID, dataValue) : ttnDataFormat(dataValue);

    if (checkDataIdIsMeasureUpload(dataID)) {
      // if telemetry.
      var measurementResolution = '-1';
      var measurementUnit = 'unknown';
      var measurementDescription = 'unknown';

      switch (dataID) {
        case 4097:
          measurementResolution = '0.01';
          measurementUnit = 'degC';
          measurementDescription = 'Air Temperature';

          // set flat measurement
          decoded.measurements.air_temperature = realDataValue;
          break;
        case 4098:
          measurementResolution = '0.01';
          measurementUnit = '%RH';
          measurementDescription = 'Air Humidity';

          // set flat measurement
          decoded.measurements.air_humidity = realDataValue;
          break;
        case 4099:
          measurementResolution = '1';
          measurementUnit = 'Lux';
          measurementDescription = 'Light Intensity';

          // set flat measurement
          decoded.measurements.light_intensity = realDataValue;
          break;
        case 4100:
          measurementResolution = '1';
          measurementUnit = 'ppm';
          measurementDescription = 'CO2';

          // set flat measurement
          decoded.measurements.co2 = realDataValue;
          break;
        case 4102:
          measurementResolution = '0.1';
          measurementUnit = 'degC';
          measurementDescription = 'Soil Temperature';

          // set flat measurement
          decoded.measurements.soil_temperature = realDataValue;
          break;
        case 4103:
          measurementResolution = '0.1';
          measurementUnit = '%';
          measurementDescription = 'Soil Moisture';

          // set flat measurement
          decoded.measurements.soil_moisture = realDataValue;
          break;
        case 4108:
          measurementResolution = '0.01';
          measurementUnit = 'dS/m';
          measurementDescription = 'Soil Electrical Conductivity';

          // set flat measurement
          decoded.measurements.soil_ec = realDataValue;
          break;
        case 4204:
          measurementResolution = '0.01';
          measurementUnit = 'mS/cm';
          measurementDescription = 'Soil Pore Water Electrical Conductivity';

          // set flat measurement
          decoded.measurements.soil_pore_water_ec = realDataValue;
          break;
        case 4205:
          measurementResolution = -1;
          measurementUnit = 'unknown';
          measurementDescription = 'Epsilon';

          // set flat measurement
          decoded.measurements.epsilon = realDataValue;
          break;
      }

      decoded.messages.push({
        type: 'report_telemetry',
        measurementId: String(dataID),
        measurementValue: String(realDataValue),
        measurementResolution: measurementResolution,
        measurementUnit: measurementUnit,
        measurementDescription: measurementDescription,
      });
    } else if (isSpecialDataId(dataID) || dataID === 5 || dataID === 6) {
      // if special order, except "report_sensor_id".
      switch (dataID) {
        case 0x00:
          // node version
          var versionData = sensorAttrForVersion(realDataValue);
          decoded.messages.push({
            type: 'upload_version',
            hardwareVersion: String(versionData.ver_hardware),
            softwareVersion: String(versionData.ver_software),
          });
          break;
        case 1:
          // sensor version
          break;
        case 2:
          // sensor eui, low bytes
          sensorEuiLowBytes = realDataValue;
          break;
        case 3:
          // sensor eui, high bytes
          sensorEuiHighBytes = realDataValue;
          break;
        case 7:
          // battery power && interval
          decoded.messages.push({
            type: 'upload_battery',
            battery: String(realDataValue.power),
          }, {
            type: 'upload_interval',
            interval: String(parseInt(realDataValue.interval) * 60),
          });
          break;
        case 0x120:
          // remove sensor
          decoded.messages.push({
            type: 'report_remove_sensor',
            channel: '1',
          });
          break;
        default:
          break;
      }
    } else {
      decoded.messages.push({
        type: 'unknown_message',
        dataID: String(dataID),
        dataValue: String(dataValue),
      });
    }
  }

  // if the complete id received, as "upload_sensor_id"
  if (sensorEuiHighBytes && sensorEuiLowBytes) {
    decoded.messages.unshift({
      type: 'upload_sensor_id',
      channel: '1',
      sensorId: (sensorEuiHighBytes + sensorEuiLowBytes).toUpperCase(),
    });
  }

  // return
  return {
    data: decoded
  };
}

function crc16Check(data) {
  return true;
}

// util
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

// util
function divideBy7Bytes(str) {
  var frameArray = [];
  for (var i = 0; i < str.length - 4; i += 14) {
    var data = str.substring(i, i + 14);
    frameArray.push(data);
  }
  return frameArray;
}

// util
function littleEndianTransform(data) {
  var dataArray = [];
  for (var i = 0; i < data.length; i += 2) {
    dataArray.push(data.substring(i, i + 2));
  }
  dataArray.reverse();
  return dataArray;
}

// util
function strTo10SysNub(str) {
  var arr = littleEndianTransform(str);
  return parseInt(arr.toString().replace(/,/g, ''), 16);
}

// util
function checkDataIdIsMeasureUpload(dataId) {
  return parseInt(dataId) > 4096;
}

// configurable.
function isSpecialDataId(dataID) {
  switch (dataID) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
    case 7:
    case 0x120:
      return true;
    default:
      return false;
  }
}

// configurable
function ttnDataSpecialFormat(dataId, str) {
  var strReverse = littleEndianTransform(str);
  if (dataId === 2 || dataId === 3) {
    return strReverse.join('');
  }

  // handle unsigned number
  var str2 = toBinary(strReverse);

  var dataArray = [];
  switch (dataId) {
    case 0: // DATA_BOARD_VERSION
    case 1: // DATA_SENSOR_VERSION
      // Using point segmentation
      for (var k = 0; k < str2.length; k += 16) {
        var tmp146 = str2.substring(k, k + 16);
        tmp146 = (parseInt(tmp146.substring(0, 8), 2) || 0) + '.' + (parseInt(tmp146.substring(8, 16), 2) || 0);
        dataArray.push(tmp146);
      }
      return dataArray.join(',');
    case 4:
      for (var i = 0; i < str2.length; i += 8) {
        var item = parseInt(str2.substring(i, i + 8), 2);
        if (item < 10) {
          item = '0' + item.toString();
        } else {
          item = item.toString();
        }
        dataArray.push(item);
      }
      return dataArray.join('');
    case 7:
      // battery && interval
      return {
        interval: parseInt(str2.substr(0, 16), 2),
          power: parseInt(str2.substr(-16, 16), 2),
      };
  }
}

// util
function ttnDataFormat(str) {
  var strReverse = littleEndianTransform(str);
  var str2 = toBinary(strReverse);
  if (str2.substring(0, 1) === '1') {
    var arr = str2.split('');
    var reverseArr = [];
    for (var forArr = 0; forArr < arr.length; forArr++) {
      var item = arr[forArr];
      if (parseInt(item) === 1) {
        reverseArr.push(0);
      } else {
        reverseArr.push(1);
      }
    }
    str2 = parseInt(reverseArr.join(''), 2) + 1;
    return parseFloat('-' + str2 / 1000);
  }
  return parseInt(str2, 2) / 1000;
}

// util
function sensorAttrForVersion(dataValue) {
  var dataValueSplitArray = dataValue.split(',');
  return {
    ver_hardware: dataValueSplitArray[0],
    ver_software: dataValueSplitArray[1],
  };
}

// util
function toBinary(arr) {
  var binaryData = [];
  for (var forArr = 0; forArr < arr.length; forArr++) {
    var item = arr[forArr];
    var data = parseInt(item, 16).toString(2);
    var dataLength = data.length;
    if (data.length !== 8) {
      for (var i = 0; i < 8 - dataLength; i++) {
        data = '0' + data;
      }
    }
    binaryData.push(data);
  }
  return binaryData.toString().replace(/,/g, '');
}

// EOF
