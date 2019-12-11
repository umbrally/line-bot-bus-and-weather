# line-bot-bus-and-weather

一個簡單的 line 機器人可以對答並且回覆特定城市的天氣以及特定路線公車的到站資訊


### Prerequisites

1. Install node.js by nvm
    * download nvm-setup.zip from nvm-windows on github and then unzip it
    * install LTS version of node.js 
```
$ nvm install 10.16.0
```

### Installing

1. Download this project 
```
$ git clone https://github.com/umbrally/line-bot-bus-and-weather.git
```

2. Install packages used in this project
```
$ npm install
```

3. PTX 網站註冊會員取得 ID 及 key

* [PTX網站](https://ptx.transportdata.tw/PTX/)

4. Line Messaging API 建立新的 Provider

* [https://developers.line.biz/zh-hant/services/messaging-api/](https://developers.line.biz/zh-hant/services/messaging-api/)

5. [http://localhost:3000](http://localhost:3000) execution on your browser
```
$ npm run dev
```

6. heroku
* https://line-bot-bus-and-weather.herokuapp.com/

## Features

* 輸入台北天氣，會回覆中央氣象局的台北天氣預報
* 輸入天氣或新竹天氣，會回覆中央氣象局的新竹天氣預報
* 輸入亞聯或1728，會回覆亞聯客運抵達大坪林站的預估時間
* 輸入5608，會回覆5608客運尚有幾占抵達關東橋
* 輸入5608 + 站點(例如 5608 竹中站)，會回覆5608客運尚有幾站抵達該站點

## Authors

* [Zoey Liu](https://github.com/umbrally) 