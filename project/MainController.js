const request = require('request');
const gpio = require('node-wiring-pi');
const mysql = require('mysql');
const sync_mysql = require('sync-mysql');
const mcpadc = require('mcp-spi-adc');
const ws281x = require('@bartando/rpi-ws281x-neopixel');
const axios=require('axios');
const FormData=require('form-data');
const fs=require('fs');
const readline=require('readline'); 


const test = require('./modules/test.js');

const logger = require("./log.js")
 
const SPI_SPEED = 1000000;
const NUM_LEDS = 12;

const park2Red = 4;
const park2Blue = 5;
const park0Red = 27;
const park0Blue = 28;
const park1Red = 6;
const park1Blue = 26;


const accelTrig1 = 0;
const accelEcho1 = 2;
const accelTrig2 = 3;
const accelEcho2 = 21;
const accelTrig3 = 22;
const accelEcho3 = 23;


const accelTrig = 24;
const accelEcho = 25;
const BUZZER = 7;
const RAZER = 29;

const CS_MCP3208_0 = 10;
const CS_MCP3208_1 = 11;

// 주차 차량 감지 (총 3개)
const CAR_PARKING_0 = 0;
const CAR_PARKING_1 = 1;
const CAR_PARKING_2 = 2;

const ELEV_UP = 3;
const ELEV_DOWN = 4;

// 두 자리 주차 차량 감지 (총 2개)
const DOUBLE_PARKING_5 = 5;
const DOUBLE_PARKING_6 = 6;

const PARK_IN = 7;
const PARK_OUT = 0;
//const PARK_OUT = 0;

let car_lightdata_0 = -1;
let car_lightdata_1 = -1;
let car_lightdata_2 = -1;

let double_lightdata_5 = -1;
let double_lightdata_6 = -1;
var elev_up_lightdata = -1;
var elev_down_lightdata = -1;

var nowInCar = 0;

ws281x.init({count:NUM_LEDS, stripType: ws281x.WS2811_STRIP_GRB});
ws281x.setBrightness(5);

const LEDon = (color, max) => {
  for(let i = max; i < NUM_LEDS; i++){
    ws281x.setPixelColor(i, {r:0, g:0, b:0});
    ws281x.show();
  }

  for(let i = 0; i < max; i++) {
    ws281x.setPixelColor(i, color);
    ws281x.show();
  }
}




let connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'gachon654321',
    database: 'parkdb'
});

var sql = new sync_mysql({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'gachon654321',
    database: 'parkdb'
});

var startTime, startTime1, startTime2, startTime3;
var travelTime, travelTime1, travelTime2, travelTime3;

var accelCount = 0;
var accelCount1 = 0;
var accelCount2 = 0;
var accelCount3 = 0;
var beforeDistance = 0, beforeDistance1 = 0, beforeDistance2 = 0, beforeDistance3 = 0;
var warningBuzzer = 0;

var timeout = 500;
var count = 0;

var url = 'http://192.168.1.103:65001'

// initialization (functions)
const elev_up = mcpadc.openMcp3208(ELEV_UP, {speedHz: SPI_SPEED}, (err) => {
  console.log('elev_up init...');
  if(err)
    console.log('fail!');
});
const elev_down = mcpadc.openMcp3208(ELEV_DOWN, {speedHz: SPI_SPEED}, (err) => {
  console.log('elev_down init...');
  if(err)
    console.log('fail!');
});

const car_parking_0 = mcpadc.openMcp3208(CAR_PARKING_0, {speedHz: SPI_SPEED}, (err) => {
    console.log('car_parking_0 init...');
    if(err) { console.log('car_parking_0 fail!'); }
});
const car_parking_1 = mcpadc.openMcp3208(CAR_PARKING_1, {speedHz: SPI_SPEED}, (err) => {
    console.log('car_parking_1 init...');
    if(err) { console.log('car_parking_1 fail!'); }
});
const car_parking_2 = mcpadc.openMcp3208(CAR_PARKING_2, {speedHz: SPI_SPEED}, (err) => {
    console.log('car_parking_2 init...');
    if(err) { console.log('car_parking_2 fail!'); }
});

const double_parking_5 = mcpadc.openMcp3208(DOUBLE_PARKING_5, {speedHz: SPI_SPEED}, (err) => {
    console.log('double_parking_5 init...');
    if(err) { console.log('double_parking_5 fail!'); }
});
const double_parking_6 = mcpadc.openMcp3208(DOUBLE_PARKING_6, {speedHz: SPI_SPEED}, (err) => {
    console.log('double_parking_6 init...');
    if(err) { console.log('double_parking_6 fail!'); }
});



const park_in = mcpadc.openMcp3208(PARK_IN, {speedHz: SPI_SPEED}, (err) => {
    console.log('park in init...');
    if(err) { console.log('park in fail!'); }
});

const park_out = mcpadc.openMcp3208(PARK_OUT, {speedHz: SPI_SPEED, deviceNumber:1}, (err) => {
    console.log('park out init...');
    if(err) { console.log('park out fail!'); }
});




// Main Controller
const mainController = () => {
    var result = fs.readFileSync('./config.json', 'utf8');
    result = JSON.parse(result);

    result.forEach((data, index) => {
    if(data.test == true) {
        count = (count == 1)? 0: 1;
        test.test(count);
    }

    if(data.accel == true) {
        //accel();
        //accel1();
        accel2();
        //accel3();
    }

    if(data.elev == true) {
        elev();
    }

    // 주차 차량 감지
    if(data.parking == true) {
        carParking();
    }

    // 두 자리 주차 차량 감지
    if(data.double_parking == true) {
        gpio.digitalWrite(RAZER, 1);
        carDoubleParking();
        gpio.digitalWrite(RAZER, 1);
    }

    if(data.maxCar == true) {
        maxCar();
    }

    if(data.parkInOut == true) {
      park_in_out();
    }
});

if(warningBuzzer == 1) {
        warningBuzzer = 0;

        gpio.digitalWrite(BUZZER, 1);
        setTimeout(turnOffBuzzer, 1000);
    }

    setTimeout(mainController, 500);
}

const accel = () => {
    gpio.digitalWrite(accelTrig, gpio.LOW);
    gpio.delayMicroseconds(2);
    gpio.digitalWrite(accelTrig, gpio.HIGH);
    gpio.delayMicroseconds(20);
    gpio.digitalWrite(accelTrig, gpio.LOW);

    while(gpio.digitalRead(accelEcho) == gpio.LOW);
    startTime = gpio.micros();

    while(gpio.digitalRead(accelEcho) == gpio.HIGH);
    travelTime = gpio.micros() - startTime;

    distance = travelTime / 58;

    if(beforeDistance < distance) {
        accelCount++;
    }
    else {
        accelCount = 0;
    }

    if(accelCount > 5) {
        accelCount = 0;
        warningBuzzer = 1;
    }

    beforeDistance = distance;
    console.log("0 : " + distance);
    //console.log(accelCount);
}



const accel1 = () => {
    gpio.digitalWrite(accelTrig1, gpio.LOW);
    gpio.delayMicroseconds(2);
    gpio.digitalWrite(accelTrig1, gpio.HIGH);
    gpio.delayMicroseconds(20);
    gpio.digitalWrite(accelTrig1, gpio.LOW);

    while(gpio.digitalRead(accelEcho1) == gpio.LOW);
    startTime1 = gpio.micros();

    while(gpio.digitalRead(accelEcho1) == gpio.HIGH);
    travelTime1 = gpio.micros() - startTime1;

    distance = travelTime1 / 58;

    if(beforeDistance1 < distance) {
        accelCount1++;
    }
    else {
        accelCount1 = 0;
    }

    if(accelCount1 > 5) {
        accelCount1 = 0;
        warningBuzzer = 1;
    }

    beforeDistance1 = distance;
    console.log("1 : " + distance);
    //console.log(accelCount);
}

const accel2 = () => {
    gpio.digitalWrite(accelTrig2, gpio.LOW);
    gpio.delayMicroseconds(2);
    gpio.digitalWrite(accelTrig2, gpio.HIGH);
    gpio.delayMicroseconds(20);
    gpio.digitalWrite(accelTrig2, gpio.LOW);

    while(gpio.digitalRead(accelEcho2) == gpio.LOW);
    startTime2 = gpio.micros();

    while(gpio.digitalRead(accelEcho2) == gpio.HIGH);
    travelTime2 = gpio.micros() - startTime2;

    distance = travelTime2 / 58;

    if(beforeDistance2 > distance) {
        accelCount2++;
    }
    else {
        accelCount2 = 0;
    }

    if(accelCount2 > 3) {
        accelCount2 = 0;
	logger.log("error", "404 : 일방통행 역주행");
        warningBuzzer = 1;
    }

    beforeDistance2 = distance;
    //console.log(accelCount);
}

const accel3 = () => {
    gpio.digitalWrite(accelTrig3, gpio.LOW);
    gpio.delayMicroseconds(2);
    gpio.digitalWrite(accelTrig3, gpio.HIGH);
    gpio.delayMicroseconds(20);
    gpio.digitalWrite(accelTrig3, gpio.LOW);

    while(gpio.digitalRead(accelEcho3) == gpio.LOW);
    startTime3 = gpio.micros();

    while(gpio.digitalRead(accelEcho3) == gpio.HIGH);
    travelTime3 = gpio.micros() - startTime3;

    distance = travelTime3 / 58;

    if(beforeDistance3 < distance) {
        accelCount3++;
    }
    else {
        accelCount3 = 0;
    }

    if(accelCount3 > 5) {
        accelCount3 = 0;
        warningBuzzer = 1;
    }

    beforeDistance3 = distance;
    console.log("3 : "+ distance);
    //console.log(accelCount);
}








const turnOffBuzzer = () => {
    gpio.digitalWrite(BUZZER, 0);
}

var elevCount = 0;



const elev = () => {
  if(elevCount == 0) {
    elev_up.read((err, reading) => {
        //console.log('elev_up : ' + reading.rawValue);
        elev_up_lightdata = reading.rawValue;
    });
    elev_down.read((err, reading) => {
        //console.log('elev_down : ' + reading.rawValue);
        elev_down_lightdata = reading.rawValue;
    });

    if(elev_up_lightdata > 2200) {
        elevCount = 1;
	logger.log("info", "203 : 엘리베이터 작동 elevup ");
        request.get(
            {
                url:url + '/elevup',
                headers: {'content-type':'application/json'}
            },
            function (err, res, body) {
                let data = JSON.parse(body);
                if(!err && res.statusCode == 200) {
                    console.log('send!');
                }
            }
        );
        setTimeout(elevCountChange, 5000);
    }
    else if(elev_down_lightdata > 2200) {
        elevCount = 1;
	logger.log("info", "203 : 엘리베이터 작동 elevdown");
        request.get(
            {
                url:url + '/elevdown',
                headers: {'content-type':'application/json'}
            },
            function (err, res, body) {
                let data = JSON.parse(body);
                if(!err && res.statusCode == 200) {
                    console.log('send!');
                }
            }
        );
        setTimeout(elevCountChange, 5000);
    }
  }
}

const elevCountChange = () => {
  elevCount = 0;
}





(function() {
    Date.prototype.toYMD = Date_toYMD;
    function Date_toYMD() {
        var year, month, day;
        year = String(this.getFullYear());
        month = String(this.getMonth() + 1);
        if (month.length == 1) {
            month = "0" + month;
        }
        day = String(this.getDate());
        if (day.length == 1) {
            day = "0" + day;
        }
        return year + "-" + month + "-" + day + " " + this.getHours() + ":" + this.getMinutes() + ":" + this.getSeconds();
    }
})();



// 주차 차량 감지
let n = 3000;                           // 현재 3초
let parking_time_0 = 0;
let parking_time_1 = 0;
let parking_time_2 = 0;

const carParking = () => {
  // 주차 자리 0번
   let myCheck = sql.query('select * from parknow where position=0');
   let myCheckNum = null;
   myCheck.forEach((data, index) => {
     myCheckNum = data.car_num;
   });

   car_parking_0.read((error, reading) => {
       //console.log("주차 자리 0번 조도값: %d", reading.rawValue);

       car_lightdata_0 = reading.rawValue;
   });

   if(car_lightdata_0 != -1) {
       if(car_lightdata_0 > 2200) {            // 0번에 차량이 주차된 경우
         if(myCheckNum == null) {
           parking_time_0 += timeout;
           console.log("parking_time_0: %d", parking_time_0);

           let position = 0;
           let car_num = null;

           if(parking_time_0 >= n) {
               car_num = nowInCar;

               connection.query('UPDATE parknow SET car_num=? WHERE position=?', [car_num, position], (err) => {
                   if(err) {
                       console.log("DB: 주차 0번 parknow 테이블 수정 실패!");
                       console.log(err);
		       logger.log("error", "400 : 주차 0번 parknow 테이블 수정 실패");
                   }
                   else {
                       console.log("DB: 주차 0번 parknow 테이블 수정 성공!");
		       logger.log("info", "200 : 주차 0번 parknow 테이블 수정 성공");

                   }
               });

               parking_time_0 = 0;
           }
         }
         gpio.digitalWrite(park0Blue, 0);
         gpio.digitalWrite(park0Red, 1);
       }
       else {
           parking_time_0 = 0;
           let noPark0 = null;
           let noParkTime0 = null;
           gpio.digitalWrite(park0Blue, 1);
           gpio.digitalWrite(park0Red, 0);

           let result = sql.query('select * from parknow where position=0');
           result.forEach((data, index) => {
             noPark0 = data.car_num;
           });

           if(noPark0 != null) {
             car_num = null;

             let result = sql.query('select * from parkcar where car_num="' + noPark0 + '"');
             result.forEach((data, index) => {
               noParkTime0 = data.start_time;
             });

             noParkTime0 = new Date(noParkTime0);
             let nowTime = new Date();

             var result1 = fs.readFileSync('./config/fee.json', 'utf8');
             result1 = JSON.parse(result1);

             let charge = result1.charge * (parseInt((nowTime.getTime() - noParkTime0.getTime()) / 3600000) + 1)

             let result2 = sql.query('insert into parklog values (0, "' + noPark0 + '", "' + noParkTime0.toYMD() + '" , "' + nowTime.toYMD()+ ' ", ' + charge + ')');

             connection.query('UPDATE parknow SET car_num=? WHERE position=?', [car_num, 0], (err) => {
                 if(err) {
                     console.log("DB: 주차 0번 parknow 테이블 수정 실패!");
                     console.log(err);
		     logger.log("error", "400 : 주차 0번 parknow 테이블 수정 실패");


                 }
                 else {
                     console.log("DB: 주차 0번 parknow 테이블 수정 성공!");
		       logger.log("info", "200 : 주차 0번 parknow 테이블 수정 성공");
                 }
             });
           }
       }

       car_lightdata_0 = -1;
   }

   let myCheck1 = sql.query('select * from parknow where position=1');
   let myCheckNum1 = null;
   myCheck1.forEach((data, index) => {
     myCheckNum1 = data.car_num;
   });

   // 주차 자리 1번
   car_parking_1.read((error, reading) => {
       //console.log("주차 자리 1번 조도값: %d", reading.rawValue);

       car_lightdata_1 = reading.rawValue;
   });

   if(car_lightdata_1 != -1) {
       if(car_lightdata_1 > 2200) {            // 1번에 차량이 주차된 경우
         if(myCheckNum1 == null) {
           parking_time_1 += timeout;
           console.log("parking_time_1: %d", parking_time_1);

           let position = 1;
           let car_num = null;

           if(parking_time_1 >= n) {
               car_num = nowInCar;
               connection.query('UPDATE parknow SET car_num=? WHERE position=?', [car_num, position], (err) => {
                   if(err) {
                       console.log("DB: 주차 1번 parknow 테이블 저장 실패!");
                       console.log(err);
		     logger.log("error", "400 : 주차 0번 parknow 테이블 수정 실패");

                   }
                   else {
                       console.log("DB: 주차 1번 parknow 테이블 저장 성공!");
                       console.log('asd' + nowInCar);
		       logger.log("info", "200 : 주차 0번 parknow 테이블 수정 성공");
                   }
               });

               parking_time_1 = 0;
           }
         }
         gpio.digitalWrite(park1Blue, 0);
         gpio.digitalWrite(park1Red, 1);
       }
       else {
           parking_time_1 = 0;
           let noPark1 = null;
           let noParkTime1 = null;
           gpio.digitalWrite(park1Blue, 1);
           gpio.digitalWrite(park1Red, 0);


           let result = sql.query('select * from parknow where position=1');
           result.forEach((data, index) => {
             noPark1 = data.car_num;
           });

           if(noPark1 != null) {
             car_num = null;

             let result = sql.query('select * from parkcar where car_num="' + noPark1 + '"');
             result.forEach((data, index) => {
               noParkTime1 = data.start_time;
             });

             noParkTime1 = new Date(noParkTime1);
             let nowTime = new Date();

             var result1 = fs.readFileSync('./config/fee.json', 'utf8');
             result1 = JSON.parse(result1);

             let charge = result1.charge * (parseInt((nowTime.getTime() - noParkTime1.getTime()) / 3600000) + 1)

             let result2 = sql.query('insert into parklog values (1, "' + noPark1 + '", "' + noParkTime1.toYMD() + '" , "' + nowTime.toYMD()+ ' ", ' + charge + ')');

             connection.query('UPDATE parknow SET car_num=? WHERE position=?', [car_num, 1], (err) => {
                 if(err) {
                     console.log("DB: 주차 1번 parknow 테이블 수정 실패!");
                     console.log(err);
		     logger.log("error", "400 : 주차 1번 parknow 테이블 수정 실패");


                 }
                 else {
                     console.log("DB: 주차 1번 parknow 테이블 수정 성공!");
		       logger.log("info", "200 : 주차 1번 parknow 테이블 수정 성공");

                 }
             });
           }
       }

       car_lightdata_1 = -1;
   }

   let myCheck2 = sql.query('select * from parknow where position=2');
   let myCheckNum2 = null;
   myCheck2.forEach((data, index) => {
     myCheckNum2 = data.car_num;
   });

   // 주차 자리 2번
   car_parking_2.read((error, reading) => {
       //console.log("주차 자리 2번 조도값: %d", reading.rawValue);

       car_lightdata_2 = reading.rawValue;
   });

   if(car_lightdata_2 != -1) {
       if(car_lightdata_2 > 2200) {            // 2번에 차량이 주차된 경우
         if(myCheckNum2 == null) {
           parking_time_2 += timeout;
           console.log("parking_time_2: %d", parking_time_2);

           let position = 2;
           let car_num = null;

           if(parking_time_2 >= n) {
               car_num = nowInCar;

               connection.query('UPDATE parknow SET car_num=? WHERE position=?', [car_num, position], (err) => {
                   if(err) {
                       console.log("DB: 주차 2번 parknow 테이블 저장 실패!");
                       console.log(err);
		       logger.log("error", "400 : 주차 2번 parknow 테이블 수정 성공");
                   }
                   else {
                       console.log("DB: 주차 2번 parknow 테이블 저장 성공!");
		       logger.log("info", "200 : 주차 2번 parknow 테이블 수정 성공");
                   }
               });

               parking_time_2 = 0;
           }
         }
         gpio.digitalWrite(park2Blue, 0);
         gpio.digitalWrite(park2Red, 1);
       }
       else {
           parking_time_2 = 0;
           let noPark2 = null;
           let noParkTime2 = null;
           gpio.digitalWrite(park2Blue, 1);
           gpio.digitalWrite(park2Red, 0);

           let result = sql.query('select * from parknow where position=2');
           result.forEach((data, index) => {
             noPark2 = data.car_num;
           });

           if(noPark2 != null) {
             car_num = null;

             let result = sql.query('select * from parkcar where car_num="' + noPark2 + '"');
             result.forEach((data, index) => {
               noParkTime2 = data.start_time;
             });

             noParkTime2 = new Date(noParkTime2);
             let nowTime = new Date();

             var result1 = fs.readFileSync('./config/fee.json', 'utf8');
             result1 = JSON.parse(result1);

             let charge = result1.charge * (parseInt((nowTime.getTime() - noParkTime2.getTime()) / 3600000) + 1)

             let result2 = sql.query('insert into parklog values (2, "' + noPark2 + '", "' + noParkTime2.toYMD() + '" , "' + nowTime.toYMD()+ ' ", ' + charge + ')');

             connection.query('UPDATE parknow SET car_num=? WHERE position=?', [car_num, 2], (err) => {
                 if(err) {
                     console.log("DB: 주차 2번 parknow 테이블 수정 실패!");
                     console.log(err);
		       logger.log("error", "400 : 주차 2번 parknow 테이블 수정 성공");
                 }
                 else {
                     console.log("DB: 주차 2번 parknow 테이블 수정 성공!");
		       logger.log("info", "200 : 주차 2번 parknow 테이블 수정 성공");
                 }
             });
           }
       }

       car_lightdata_2 = -1;
   }
}

let double_time_5 = 0;
let double_time_6 = 0;
// 두 자리 주차 차량 감지
const carDoubleParking = () => {

    // 두 자리 주차 자리 5번
    double_parking_5.read((error, reading) => {
        //console.log("두 자리 주차 5번 조도값: %d", reading.rawValue);

        double_lightdata_5 = reading.rawValue;
    });

    if(double_lightdata_5 != -1) {
        if(double_lightdata_5 > 300) {
            double_time_5 += timeout;
            //console.log("double_time_5: %d", double_time_5);

            if(double_time_5 >= n) {
	    	logger.log("error", "401 : 두자리 주차 차량 감지, double_time_5 BUZZER ON");
                console.log("double_parking_5: BUZZER ON!");
                gpio.digitalWrite(BUZZER, 1);
                double_time_5 = 0;

                setTimeout(turnOffBuzzer, 1000);
            }
        }
        else {
            double_time_5 = 0;
        }

        double_lightdata_5 = -1;
    }

    // 두 자리 주차 자리 6번
    double_parking_6.read((error, reading) => {
        //console.log("두 자리 주차 6번 조도값: %d", reading.rawValue);

        double_lightdata_6 = reading.rawValue;
    });

    if(double_lightdata_6 != -1) {
        if(double_lightdata_6 > 550) {
            double_time_6 += timeout;
            //console.log("double_time_6: %d", double_time_6);

            if(double_time_6 >= n) {
	    	logger.log("error", "401 : 두자리 주차 차량 감지, double_time_6: BUZZER ON");
                console.log("double_time_6: BUZZER ON!");
                gpio.digitalWrite(BUZZER, 1);
                double_time_6 = 0;

                setTimeout(turnOffBuzzer, 1000);
            }
        }
        else {
            double_time_6 = 0;
        }

        double_lightdata_6 = -1;
    }
}



const maxCar = () => {

  let car_count = 0;

  let result = sql.query('select * from parknow');
  result.forEach((data, index) => {
    if(data.car_num != null)
      car_count++;
  });

  if(car_count == NUM_LEDS) {
      LEDon({r: 180, g:0, b:0}, NUM_LEDS);
  }
  else {
    LEDon({r:0, g:0, b:180}, car_count);
  }
}

const rl=readline.createInterface({
  input:process.stdin,
  output:process.stdout,
});





//키오스크 코드 kiosk
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);


io.on('connection', function (socket) {
    socket.on('payment', function () {
        //결제됨 출차기 작동
        console.log("결제완료 출차기 open")
              request.get(
                {
                  url:url + '/parkOut',
                  headers: {'content-type':'application/json'}
                },
                function (err, res, body) {
                  //let data = JSON.parse(body);
                  if(!err && res.statusCode == 200) {
                    console.log('send!');
                  }
                }
              );

              setTimeout(setOutCount, 3000);

	
    });

});

app.get('/', function (req, res) {
    console.log("키오스크 접속");
    res.sendFile(__dirname + '/kiosk.html');
});


app.get('/msg', function (req, res) {
    res.sendFile(__dirname + '/kioskmsg.html');
});


 

server.listen(65002, function () {
    console.log('키오스크 서버 작동 port:65002');
    //테스트용 차가 나가는 걸 만들어주는 함수

});

 









let park_in_count = 0;
let park_out_count = 0;
let park_in_value = 0;
let park_out_value = 0;
let inCount = 0;
let outCount = 0;

const setInCount = () => {
  inCount = 0;
}

const setOutCount = () => {
  outCount = 0;
}

const park_in_out = () => {

  park_in.read((err, reading) => {
    //console.log(reading.rawValue);
    park_in_value = reading.rawValue;
  });
  park_out.read((err, reading) => {
    //console.log(reading.rawValue);
    park_out_value = reading.rawValue;
  });

  if(park_in_value >= 2200) {
    if(park_in_count >= 4) {
      if(inCount  == 0) {
        inCount = 1;
        rl.question('번호를 입력하세요(1~5)', (answer)=>{
          fs.readFile(`./img${answer}.jpg`, (error, data)=>{
            const formData=new FormData();
            formData.append(`img${answer}.jpg`, data);

            axios.post('https://5brwcevbu1.execute-api.ap-northeast-2.amazonaws.com/img2string', formData, {
              headers:{
                'content-type': 'multipart/form-data',
                'accept': 'application/json'
              }
            }).then((res)=>{
                console.log(res.data);
                nowInCar = res.data;
                let result1 = sql.query('insert into parkcar values ("' + res.data + '", sysdate())');
		logger.log("info", "201 : 입차 차량 번호 : "+res.data+" 입차 완료 ");

            }).then(() => {
              request.get(
                {
                  url:url + '/parkIn',
                  headers: {'content-type':'application/json'}
                },
                function (err, res, body) {
                  //let data = JSON.parse(body);
                  if(!err && res.statusCode == 200) {
                    //console.log('send!');
                  }
                }
              );
              setTimeout(setInCount, 3000);

            });
          });
        });
      }

      park_in_count = 0;
    }
    else {
      park_in_count += 1;
    }
  }
  else {
    park_in_count = 0;
  }

  if(park_out_value >= 2200) {
    if(park_out_count >= 4) {
      if(outCount == 0) {
        outCount = 1;
        rl.question('번호를 입력하세요(1~5)', (answer)=>{
          fs.readFile(`./img${answer}.jpg`, (error, data)=>{
            const formData=new FormData();
            formData.append(`img${answer}.jpg`, data);

            axios.post('https://5brwcevbu1.execute-api.ap-northeast-2.amazonaws.com/img2string', formData, {
              headers:{
                'content-type': 'multipart/form-data',
                'accept': 'application/json'
              }
            }).then((res)=>{
                //let result4 = sql.query('select * from parkcar where car_num="' + res.data + '"');
                let result5 = sql.query('delete from parkcar where car_num="' + res.data + '"');

                let kiosk_result = sql.query('select car_num, pay from parklog where car_num ="'+res.data+'" ORDER BY end_time;');
		let kiosk_lent = kiosk_result.length;
		console.log("pay",res.data, kiosk_result[kiosk_lent-1].pay)
		io.emit("pay",res.data, kiosk_result[kiosk_lent-1].pay);
		logger.log("info", "202 : 출차 요청 차량 번호 : "+res.data);



            }).then(()=>{
            });
          });
        });
      }

      park_out_count = 0;
    }
    else {
      park_out_count += 1;
    }
  }
  else {
    park_out_count = 0;
  }
}






process.on('SIGINT', () => {
  gpio.digitalWrite(BUZZER, 0);
  gpio.digitalWrite(RAZER, 0);

  gpio.digitalWrite(park0Blue, 0);
  gpio.digitalWrite(park0Red, 0);
  gpio.digitalWrite(park1Blue, 0);
  gpio.digitalWrite(park1Red, 0);
  gpio.digitalWrite(park2Blue, 0);
  gpio.digitalWrite(park2Red, 0);

  ws281x.reset();
  process.exit();
});

// initialization (modules)
gpio.wiringPiSetup();
gpio.pinMode(accelTrig, gpio.OUTPUT);
gpio.pinMode(accelEcho, gpio.INPUT);
gpio.pinMode(accelTrig1, gpio.OUTPUT);
gpio.pinMode(accelEcho1, gpio.INPUT);
gpio.pinMode(accelTrig2, gpio.OUTPUT);
gpio.pinMode(accelEcho2, gpio.INPUT);
gpio.pinMode(accelTrig3, gpio.OUTPUT);
gpio.pinMode(accelEcho3, gpio.INPUT);
gpio.pinMode(park0Blue, gpio.OUTPUT);
gpio.pinMode(park0Red, gpio.OUTPUT);
gpio.pinMode(park1Blue, gpio.OUTPUT);
gpio.pinMode(park1Red, gpio.OUTPUT);
gpio.pinMode(park2Blue, gpio.OUTPUT);
gpio.pinMode(park2Red, gpio.OUTPUT);
gpio.pinMode(BUZZER, gpio.OUTPUT);
gpio.pinMode(RAZER, gpio.OUTPUT);

gpio.pinMode(CS_MCP3208_0, gpio.OUTPUT);
gpio.pinMode(CS_MCP3208_1, gpio.OUTPUT);

setTimeout(mainController, 500);

gpio.digitalWrite(park0Red, 1);

//exports.mainController = mainController;




    logger.log("info", "200 : 스마트 주차장 시스템 시작")

 





