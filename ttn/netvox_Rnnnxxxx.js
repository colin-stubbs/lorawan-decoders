// Netvox Rnnnxxx

/*

  payload: 011A012401000000000000
  fport: 6

  result,

  {
    "err": 0,
    "measurements": {
      "status": 1,
      "volt": 3.6
    },
    "messages": [
      {
        "deviceManufacturer": "Netvox",
        "deviceModel": "R718DA",
        "type": "device_metadata"
      },
      {
        "measurementDescription": "Voltage",
        "measurementId": "1664",
        "measurementResolution": "1",
        "measurementUnit": "Volt",
        "measurementValue": "3.6",
        "type": "report_telemetry"
      },
      {
        "measurementDescription": "Status",
        "measurementId": "1536",
        "measurementResolution": "1",
        "measurementUnit": "Value",
        "measurementValue": "1",
        "type": "report_telemetry"
      }
    ],
    "payload": "011A012401000000000000",
    "valid": true
  }

*/

function getCfgCmd(cfgcmd){
  var cfgcmdlist = {
    1:   "ConfigReportReq",
    129: "ConfigReportRsp",
    2:   "ReadConfigReportReq",
    130: "ReadConfigReportRsp"
  };
  return cfgcmdlist[cfgcmd];
}

function getDeviceName(dev){
  var deviceName = {
  26: "R718DA",
    27: "R718DB",
  33: "R718J",
  37: "R718LB",
  39: "R718MBA",
  79: "R311FA",
  91: "R718Q",
  130: "R730MBA",
  137: "R730DA",
  139: "R730DB",
  141: "R730LB",
  151: "R718QA",
  158: "R311K",
  159: "R718VA",
  168: "R311DA",
  169: "R311DB",
  183: "R720F"
  };
  return deviceName[dev];
}

function getCmdToID(cmdtype){
  if (cmdtype == "ConfigReportReq")
    return 1;
  else if (cmdtype == "ConfigReportRsp")
    return 129;
  else if (cmdtype == "ReadConfigReportReq")
    return 2;
  else if (cmdtype == "ReadConfigReportRsp")
    return 130;
}

function getDeviceType(devName){
  if (devName == "R718DA")
    return 26;
  else if (devName == "R718DB")
    return 27;
  else if (devName == "R718J")
    return 33;
  else if (devName == "R718LB")
    return 37;
  else if (devName == "R718MBA")
    return 39;
  else if (devName == "R311FA")
    return 79;
  else if (devName == "R718Q")
      return 91;
  else if (devName == "R730MBA")
      return 130;
  else if (devName == "R730DA")
    return 137;
  else if (devName == "R730DB")
    return 139;
  else if (devName == "R730LB")
    return 141;
  else if (devName == "R718QA")
      return 151;
  else if (devName == "R311K")
      return 158;
  else if (devName == "R718VA")
      return 159;
  else if (devName == "R311DA")
      return 168;
  else if (devName == "R311DB")
    return 169;
  else if (devName == "R720F")
      return 183;
}

function padLeft(str, len) {
    str = '' + str;
    if (str.length >= len) {
        return str;
    } else {
        return padLeft("0" + str, len);
    }
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

  switch (input.fPort) {
    case 6:
    if (input.bytes[2] === 0x00)
    {
      decoded.messages.push({
        type: 'device_metadata',
        deviceManufacturer: 'Netvox',
        deviceModel: getDeviceName(input.bytes[1]),
        deviceSoftwareVersion: String(input.bytes[3]/10),
        deviceHardwareVersion: String(input.bytes[4]),
        deviceDateCode: padLeft(input.bytes[5].toString(16), 2) + padLeft(input.bytes[6].toString(16), 2) + padLeft(input.bytes[7].toString(16), 2) + padLeft(input.bytes[8].toString(16), 2),
      });

      return {
        data: decoded,
      };
    } else {
      decoded.messages.push({
        type: 'device_metadata',
        deviceManufacturer: 'Netvox',
        deviceModel: getDeviceName(input.bytes[1]),
      });      
    }
    if (input.bytes[3] & 0x80) {
      var tmp_v = input.bytes[3] & 0x7F;
      decoded.measurements.volt = (tmp_v / 10).toString() + '(low battery)';
    }
    else {
      decoded.measurements.volt = input.bytes[3]/10;
    }

    decoded.messages.push({
      type: 'report_telemetry',
      measurementId: String(0x0680),
      measurementValue: String(decoded.measurements.volt),
      measurementResolution: '1',
      measurementUnit: 'Volt',
      measurementDescription: 'Voltage',
    });

    decoded.measurements.status = input.bytes[4];

    decoded.messages.push({
      type: 'report_telemetry',
      measurementId: String(0x0600),
      measurementValue: String(decoded.measurements.status),
      measurementResolution: '1',
      measurementUnit: 'Value',
      measurementDescription: 'Status',
    });

    break;
    
  case 7:
    if (input.bytes[0] === 0x81)
    {
      decoded.Cmd = getCfgCmd(input.bytes[0]);
      decoded.Status = (input.bytes[2] === 0x00) ? 'Success' : 'Failure';

      decoded.messages.push({
        type: 'command_result',
        deviceManufacturer: 'Netvox',
        deviceModel: getDeviceName(input.bytes[1]),
        command: getCfgCmd(input.bytes[0]),
        commandStatus: (input.bytes[2] === 0x00) ? 'Success' : 'Failure',
      });
    }
    else if (input.bytes[0] === 0x82) {
      decoded.Cmd = getCfgCmd(input.bytes[0]);
      decoded.MinTime = (input.bytes[2]<<8 | input.bytes[3]);
      decoded.MaxTime = (input.bytes[4]<<8 | input.bytes[5]);
      decoded.BatteryChange = input.bytes[6]/10;

      decoded.messages.push({
        type: 'command_result',
        deviceManufacturer: 'Netvox',
        deviceModel: getDeviceName(input.bytes[1]),
        command: getCfgCmd(input.bytes[0]),
        minTime: String((input.bytes[2]<<8 | input.bytes[3])),
        maxTime: String((input.bytes[4]<<8 | input.bytes[5])),
        batteryChange: String(input.bytes[6]/10),
      });
    } else {
      decoded.messages.push({
        type: 'unknown',
        deviceManufacturer: 'Netvox',
        deviceModel: getDeviceName(input.bytes[1]),
      });
    }
    break;
    
  default:
      return {
        errors: ['unknown FPort'],
      };
    
    }

   return {
    data: decoded,
  };
 }
  
function encodeDownlink(input) {
  var ret = [];
  var devid;
  var port;
  var getCmdID;
    
  getCmdID = getCmdToID(input.data.Cmd);
  devid = getDeviceType(input.data.Device);

  if (input.data.Cmd == "ConfigReportReq")
  {
    var mint = input.data.MinTime;
    var maxt = input.data.MaxTime;
    var batteryChg = input.data.BatteryChange * 10;
    
    port = 7;
    ret = ret.concat(getCmdID, devid, (mint >> 8), (mint & 0xFF), (maxt >> 8), (maxt & 0xFF), batteryChg, 0x00, 0x00, 0x00, 0x00);
  }
  else if (input.data.Cmd == "ReadConfigReportReq")
  {
    port = 7;
    ret = ret.concat(getCmdID, devid, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
  }  
    
  return {
    fPort: port,
    bytes: ret
  };
}  
  
function decodeDownlink(input) {
  var data = {};
  switch (input.fPort) {
    case 7:
    data.Device = getDeviceName(input.bytes[1]);
    if (input.bytes[0] === getCmdToID("ConfigReportReq"))
    {
      data.Cmd = getCfgCmd(input.bytes[0]);
      data.MinTime = (input.bytes[2]<<8 | input.bytes[3]);
      data.MaxTime = (input.bytes[4]<<8 | input.bytes[5]);
      data.BatteryChange = input.bytes[6]/10;
    }
    else if (input.bytes[0] === getCmdToID("ReadConfigReportReq"))
    {
      data.Cmd = getCfgCmd(input.bytes[0]);
    }
    break;
    
    default:
      return {
        errors: ['invalid FPort'],
      };
  }
  
  return {
    data: data,
  };
}

// EOF
