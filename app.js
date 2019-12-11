const request = require('request')
const rp = require('request-promise-native')
const cheerio = require('cheerio')
const jsSHA = require('jssha')
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const port = process.env.PORT || 3000

// 串接 PTX API 所需認證
const getAuthorizationHeader = function () {
  var AppID = process.env.PTX_APP_ID;
  var AppKey = process.env.PTX_APP_KEY;

  var GMTString = new Date().toGMTString();
  var ShaObj = new jsSHA('SHA-1', 'TEXT');
  ShaObj.setHMACKey(AppKey, 'TEXT');
  ShaObj.update('x-date: ' + GMTString);
  var HMAC = ShaObj.getHMAC('B64');
  var Authorization = 'hmac username=\"' + AppID + '\", algorithm=\"hmac-sha1\", headers=\"x-date\", signature=\"' + HMAC + '\"';

  return { 'Authorization': Authorization, 'X-Date': GMTString };
}
const getBusInfo = function (busResult, destinationGo, destinationBack) {
  let busInfo = ''
  busResult.forEach((item, index) => {
    console.log(item)
    const direction = item.Direction === 0 ? `往 ${destinationGo}` : `往 ${destinationBack}`
    let status = ''
    switch (item.StopStatus) {
      case 0:
        status = `約 ${Math.round(item.EstimateTime / 60)}分鐘`
        break
      case 1:
        status = '尚未發車'
        break
      case 2:
        status = '交管不停靠'
        break
      case 3:
        status = '末班車已過'
        break
      case 4:
        status = '今日未營運'
        break
    }
    busInfo += direction + ':' + status + '\n'
  })
  return busInfo
}
// 引用linebot SDK
var linebot = require('linebot');

// 用於辨識Line Channel的資訊
var bot = linebot({
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

// 當有人傳送訊息給Bot時
bot.on('message', function (event) {
  console.log('說', event)

  // event.message.text是使用者傳給bot的訊息
  // 使用event.reply(要回傳的訊息)方法可將訊息回傳給使用者
  let hsinchuWeather = new RegExp('(新竹)*.*天氣')
  let taipeiWeather = new RegExp('(台北).*天氣')
  let hello = new RegExp('是(?=美美|瑪姬|Maggie|誰|馬基|馬雞)')
  let callName = new RegExp('^(臭|笨|胖)*美美|瑪姬|Maggie|馬基|馬雞&')
  let checkWho = new RegExp('我是誰')
  let stupid = new RegExp('(你|妳)*.*笨')
  let shower = new RegExp('洗澡')
  let bus = /([^\d]|\b|\B)(647|1728|亞聯|5608)(?!\d)/
  let notDigitNorSpace = /[^\d\s]+/
  let title = ''
  const userId = event.source.userId
  async function main() {
    console.log('===1===')
    try {
      switch (userId) {
        case process.env.LINE_ID_1:
          title = '三姊'
          break
        case process.env.LINE_ID_2:
          title = '二姊'
          break
        case process.env.LINE_ID_3:
          title = '大姊'
          break
        case process.env.LINE_ID_4:
          title = '鄭文翔'
          break
        case process.env.LINE_ID_5:
          title = '媽媽'
          break
        case process.env.LINE_ID_6:
          title = '爸爸'
          break
        default:
          let result = await rp({
            url: `https://api.line.me/v2/bot/profile/${userId}`,
            headers: {
              'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
            }
          })
          title = JSON.parse(result).displayName

      }

      let msg = event.message.text ? event.message.text : '什麼'
      let replyContent = `Hi ${title}, 我是美美，你是說${msg}嗎? 聽不懂啦因為我現在肚子餓想吃牛肉~`
      if (hello.test(msg)) { replyContent = `Hi ${title}, 對阿我是美美本人阿` }
      if (checkWho.test(msg)) {
        replyContent = `你是${title}啊!`
      }
      if (stupid.test(msg)) {
        replyContent = `我覺得我比${title}聰明!`
      }
      if (callName.test(msg)) {
        replyContent = '叫我幹嘛'
      }
      if (shower.test(msg)) {
        replyContent = '我不是才剛洗過澡嗎?! '
      }
      if (hsinchuWeather.test(msg)) {
        let result = await rp('https://www.cwb.gov.tw/V7/forecast/taiwan/Hsinchu_City.htm')
        let weathers = []
        const $ = cheerio.load(result)
        $('#box8 .FcstBoxTable01 tbody tr').each(function (i, elem) {
          weathers.push(
            $(this)
              .text()
              .split('\n')
          )
        })
        let weatherString = ''
        weathers.forEach(weather => {
          weatherString += weather[1].substring(2).split(' ')[0] + ':' + '溫度' + weather[2].substring(2) + ',' + '降雨機率' + weather[6].substring(2) + '.\n'
        })
        replyContent = `Hi ${title}, 我是美美，你是要問新竹天氣嗎?\n${weatherString}`
      }
      if (taipeiWeather.test(msg)) {
        let result = await rp('https://www.cwb.gov.tw/V7/forecast/taiwan/Taipei_City.htm')
        let weathers = []
        const $ = cheerio.load(result)
        $('#box8 .FcstBoxTable01 tbody tr').each(function (i, elem) {
          weathers.push(
            $(this)
              .text()
              .split('\n')
          )
        })
        let weatherString = ''
        weathers.forEach(weather => {
          weatherString += weather[1].substring(2).split(' ')[0] + ':' + '溫度' + weather[2].substring(2) + ',' + '降雨機率' + weather[6].substring(2) + '.\n'
        })
        replyContent = `Hi ${title}, 我是美美，你是要問台北市天氣嗎?\n${weatherString}`
      }
      if (bus.exec(msg)) {
        const busNumber = bus.exec(msg)[2]
        console.log('公車號碼', busNumber)
        let busResult
        if (busNumber === '647') {
          busResult = await rp({
            url: `https://ptx.transportdata.tw/MOTC/v2/Bus/EstimatedTimeOfArrival/City/Taipei/647?$filter=contains(StopName%2FZh_tw%2C'${encodeURI('寶興路口')}')&$top=30&$format=JSON`, headers: getAuthorizationHeader(), json: true
          })
          let busInfo = getBusInfo(busResult, '捷運市政府站', '大崎腳')
          replyContent = `Hi ${title}, 647公車-寶興路口的抵達時間: \n${busInfo}`
        }
        else if (busNumber === '1728' || busNumber === '亞聯') {
          busResult = await rp({
            url: `https://ptx.transportdata.tw/MOTC/v2/Bus/EstimatedTimeOfArrival/InterCity/1728?$filter=contains(StopName%2FZh_tw%2C'%E5%A4%A7%E5%9D%AA%E6%9E%97')&$top=30&$format=JSON`, headers: getAuthorizationHeader(), json: true
          })
          console.log('----', busResult)
          let busInfo = getBusInfo(busResult, '新竹', '台北')
          replyContent = `Hi ${title}, 亞聯-捷運大坪林站的抵達時間: \n${busInfo}`
        }
        else if (busNumber === '5608') {
          const queryStopName = notDigitNorSpace.exec(msg) ? notDigitNorSpace.exec(msg)[0] : '關東橋'
          console.log('---', queryStopName)
          const stops = await rp({
            url: `https://ptx.transportdata.tw/MOTC/v2/Bus/StopOfRoute/InterCity/5608?$select=Stops&$format=JSON`,
            headers: getAuthorizationHeader(), json: true
          })
          const nearStops = await rp({
            url: `https://ptx.transportdata.tw/MOTC/v2/Bus/RealTimeNearStop/InterCity/5608?$top=30&$format=JSON`,
            headers: getAuthorizationHeader(), json: true
          })
          let goStopSequence = 0
          let backStopSequence = 0
          let stopName = ''
          stops.forEach(item => {
            item.Stops.forEach(stopInfo => {
              if (stopInfo.StopName.Zh_tw.includes(queryStopName)) {
                if (item.Direction === 0) {
                  goStopSequence = stopInfo.StopSequence
                }
                else {
                  backStopSequence = stopInfo.StopSequence
                }
                stopName = stopInfo.StopName.Zh_tw
              }
            })
          })
          if (!stopName) {
            replyContent = '無此站點'
          }
          else {
            const goNearStops = []
            const backNearStops = []
            nearStops.forEach(item => {
              if (item.Direction === 0) {
                if (goStopSequence - item.StopSequence >= 0) {
                  goNearStops.push(goStopSequence - item.StopSequence)
                }
              }
              else {
                if (backStopSequence - item.StopSequence >= 0) {
                  backNearStops.push(backStopSequence - item.StopSequence)
                }
              }
            })
            const goStopCounts = goNearStops.length > 0 ? Math.min(...goNearStops) : '無'
            const backStopCounts = backNearStops.length > 0 ? Math.min(...backNearStops) : '無'
            replyContent = `Hi ${title}\n往下公館: 還有${goStopCounts}站抵達 ${stopName}\n往新竹: 還有${backStopCounts}站抵達 ${stopName}`
          }
        }
      }
      console.log('=====', replyContent)
      event.reply(replyContent).then(function (data) {
        // 當訊息成功回傳後的處理
        console.log("回傳成功")
      }).catch(function (error) {
        // 當訊息回傳失敗後的處理
        console.log("回傳失敗")
      });
    }
    catch (error) {
      console.warn(error)
    }
  }
  main()
});

// Bot所監聽的webhook路徑與port
bot.listen('/linewebhook', port, function () {
  console.log('[BOT已準備就緒]');
});


